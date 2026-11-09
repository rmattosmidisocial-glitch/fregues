import { geoMercator, geoPath, type GeoPermissibleObjects } from "d3-geo";
import React, { useMemo, useState } from "react";
import { feature } from "topojson-client";
import bairrosTopo from "../data/bairros-rj.topo.json";
import rjMunicipios from "../data/rj-municipios.json";

export type Feature = {
  type: "Feature";
  properties: { id: string; nome: string; municipio?: string; mun?: string };
  geometry: GeoPermissibleObjects;
};

// d3-geo espera anéis externos no sentido horário (o oposto do padrão RFC 7946)
function area(ring: number[][]) {
  let a = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % n];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}
function rewindPoly(poly: number[][][]) {
  return poly.map((ring, i) => {
    const ccw = area(ring) > 0;
    return (i === 0 ? ccw : !ccw) ? [...ring].reverse() : ring;
  });
}
function rewind(fs: Feature[]): Feature[] {
  return fs.map((f) => {
    const g = f.geometry as unknown as { type: string; coordinates: unknown };
    const coordinates = g.type === "Polygon" ? rewindPoly(g.coordinates as number[][][]) : (g.coordinates as number[][][][]).map(rewindPoly);
    return { ...f, geometry: { type: g.type, coordinates } as unknown as GeoPermissibleObjects };
  });
}

// Bairros oficiais de todos os municípios do RJ: IBGE, Malha de Bairros do Censo 2022
const topo = bairrosTopo as unknown as Parameters<typeof feature>[0] & { objects: Record<string, unknown> };
const colecao = feature(topo, topo.objects[Object.keys(topo.objects)[0]] as never) as unknown as { features: Feature[] };
export const BAIRROS = rewind(colecao.features);
export const BAIRRO_POR_ID: Record<string, Feature> = Object.fromEntries(BAIRROS.map((b) => [b.properties.id, b]));
export const BAIRROS_RIO = BAIRROS.filter((b) => b.properties.municipio === "Rio de Janeiro");
export const MUNICIPIOS_RJ = rewind((rjMunicipios as unknown as { features: Feature[] }).features);
export const MUNICIPIOS_COM_BAIRROS = new Set(BAIRROS.map((b) => b.properties.municipio));
export const bairrosDoMunicipio = (nome: string) => BAIRROS.filter((b) => b.properties.municipio === nome);
export const nomeBairro = (id: string) => BAIRRO_POR_ID[id]?.properties.nome ?? id;
export const idRio = (nome: string) => BAIRROS_RIO.find((b) => b.properties.nome === nome)?.properties.id ?? nome;

export function bbox(fs: Feature[]): [number, number, number, number] {
  let x0 = 180, y0 = 90, x1 = -180, y1 = -90;
  const walk = (c: unknown): void => {
    if (typeof (c as number[])[0] === "number") {
      const [x, y] = c as number[];
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    } else (c as unknown[]).forEach(walk);
  };
  fs.forEach((f) => walk((f.geometry as unknown as { coordinates: unknown }).coordinates));
  return [x0, y0, x1, y1];
}

/** Bairros (de qualquer município) cujo centro cai na área ao redor das feições dadas */
export function vizinhos(fs: Feature[], margem = 0.25): Feature[] {
  if (!fs.length) return [];
  const [x0, y0, x1, y1] = bbox(fs);
  const mx = (x1 - x0) * margem, my = (y1 - y0) * margem;
  return BAIRROS.filter((b) => {
    const [cx, cy] = centroide(b);
    return cx >= x0 - mx && cx <= x1 + mx && cy >= y0 - my && cy <= y1 + my;
  });
}

export type Layer = {
  id: string;
  features: Feature[];
  fill: (f: Feature, hover: boolean) => string;
  stroke?: (f: Feature) => string;
  strokeWidth?: number;
  interactive?: boolean;
  opacity?: (f: Feature) => number;
  className?: string;
  style?: React.CSSProperties;
};

type Props = {
  width: number;
  height: number;
  fitTo: Feature[];
  layers: Layer[];
  padding?: number;
  onClick?: (f: Feature, layerId: string) => void;
  onHover?: (f: Feature | null, layerId: string | null) => void;
  pins?: { coord: [number, number]; kind: "loja" | "cliente" | "moto"; label?: string }[];
  heat?: { coord: [number, number]; w: number }[];
  className?: string;
  ariaLabel: string;
  onPointClick?: (coord: [number, number]) => void;
  labels?: { coord: [number, number]; text: string; forte?: boolean }[];
};

export function GeoMap({ width, height, fitTo, layers, padding = 12, onClick, onHover, pins = [], heat = [], className = "", ariaLabel, onPointClick, labels = [] }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  const { path, projection } = useMemo(() => {
    const projection = geoMercator().fitExtent(
      [
        [padding, padding],
        [width - padding, height - padding],
      ],
      { type: "FeatureCollection", features: fitTo } as unknown as GeoPermissibleObjects,
    );
    return { path: geoPath(projection), projection };
  }, [width, height, fitTo, padding]);

  const paths = useMemo(
    () => layers.map((l) => ({ ...l, d: l.features.map((f) => ({ f, d: path(f.geometry) ?? "" })) })),
    [layers, path],
  );

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label={ariaLabel}
      onClick={
        onPointClick
          ? (e) => {
              const svg = e.currentTarget;
              const pt = svg.createSVGPoint();
              pt.x = e.clientX;
              pt.y = e.clientY;
              const m = svg.getScreenCTM();
              if (!m) return;
              const p = pt.matrixTransform(m.inverse());
              const c = projection.invert?.([p.x, p.y]);
              if (c) onPointClick(c as [number, number]);
            }
          : undefined
      }
    >
      <defs>
        <radialGradient id="heat">
          <stop offset="0" stopColor="#ff5b1f" stopOpacity="0.75" />
          <stop offset="1" stopColor="#ff5b1f" stopOpacity="0" />
        </radialGradient>
      </defs>
      {paths.map((l) => (
        <g key={l.id} className={l.className} style={l.style}>
          {l.d.map(({ f, d }) => {
            const key = `${l.id}:${f.properties.id}`;
            const isHover = hover === key;
            return (
              <path
                key={key}
                d={d}
                fill={l.fill(f, isHover)}
                fillOpacity={l.opacity ? l.opacity(f) : 1}
                stroke={l.stroke ? l.stroke(f) : "#17110e"}
                strokeWidth={l.strokeWidth ?? 0.6}
                strokeLinejoin="round"
                style={{ cursor: l.interactive ? "pointer" : "default", transition: "fill 180ms ease" }}
                onMouseEnter={
                  l.interactive
                    ? () => {
                        setHover(key);
                        onHover?.(f, l.id);
                      }
                    : undefined
                }
                onMouseLeave={
                  l.interactive
                    ? () => {
                        setHover(null);
                        onHover?.(null, null);
                      }
                    : undefined
                }
                onClick={l.interactive ? () => onClick?.(f, l.id) : undefined}
              >
                <title>{f.properties.nome}</title>
              </path>
            );
          })}
        </g>
      ))}
      {heat.map((h, i) => {
        const p = projection(h.coord);
        if (!p) return null;
        return <circle key={i} cx={p[0]} cy={p[1]} r={6 + h.w * 10} fill="url(#heat)" style={{ pointerEvents: "none" }} />;
      })}
      {labels.map((l, i) => {
        const p = projection(l.coord);
        if (!p) return null;
        return (
          <text
            key={"l" + i}
            x={p[0]}
            y={p[1]}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={l.forte ? 13 : 11}
            fontWeight={l.forte ? 700 : 500}
            fontFamily="Instrument Sans, sans-serif"
            fill={l.forte ? "#17110e" : "#c9b8a6"}
            stroke={l.forte ? "none" : "#17110e"}
            strokeWidth={3}
            paintOrder="stroke"
            style={{ pointerEvents: "none" }}
          >
            {l.text}
          </text>
        );
      })}
      {pins.map((pin, i) => {
        const p = projection(pin.coord);
        if (!p) return null;
        return (
          <g key={i} transform={`translate(${p[0]} ${p[1]})`} style={{ pointerEvents: "none" }}>
            {pin.kind === "loja" ? (
              <>
                <circle r="13" fill="#ff5b1f" opacity="0.25">
                  <animate attributeName="r" values="9;18;9" dur="2.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.35;0;0.35" dur="2.4s" repeatCount="indefinite" />
                </circle>
                <circle r="7" fill="#ff5b1f" stroke="#fff6e9" strokeWidth="2.5" />
              </>
            ) : pin.kind === "moto" ? (
              <>
                <circle r="6" fill="#ffc03a" stroke="#17110e" strokeWidth="2" />
              </>
            ) : (
              <>
                <path d="M0 0c-6-8-9-11-9-15a9 9 0 0 1 18 0c0 4-3 7-9 15z" fill="#fff6e9" stroke="#17110e" strokeWidth="1.5" />
                <circle cy="-15" r="3.4" fill="#ff5b1f" />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function centroide(f: Feature): [number, number] {
  // anel externo do maior polígono; serve para Polygon, MultiPolygon e coleções
  const g = f.geometry as unknown as { type: string; coordinates?: unknown; geometries?: { coordinates: unknown }[] };
  const aneis: number[][][] = [];
  const coletar = (c: unknown): void => {
    if (!Array.isArray(c) || !c.length) return;
    if (Array.isArray(c[0]) && typeof (c[0] as unknown[])[0] === "number") aneis.push(c as number[][]);
    else if (Array.isArray(c[0]) && Array.isArray((c[0] as unknown[])[0]) && typeof ((c[0] as unknown[])[0] as unknown[])[0] === "number") aneis.push((c as number[][][])[0]);
    else (c as unknown[]).forEach(coletar);
  };
  if (g.geometries) g.geometries.forEach((x) => coletar(x.coordinates));
  else coletar(g.coordinates);
  if (!aneis.length) return [-43.2, -22.9];
  const ring = aneis.reduce((a, b) => (Math.abs(area(b)) > Math.abs(area(a)) ? b : a));
  let x = 0,
    y = 0;
  for (const c of ring) {
    x += c[0];
    y += c[1];
  }
  return [x / ring.length, y / ring.length];
}
