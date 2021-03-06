import * as convert from 'xml-js'
import { GeometryObject } from 'typings/geojson'
import { isNothing } from '../utils'

interface FeatureInfo {
  type: 'FeatureCollection'
  crs: {
    type: string
    properties: {
      name: string
    } | null
  }
  features: Array<{
    type: 'Feature'
    id: string
    geometry: GeometryObject
    geometry_name: string
    properties: {
      [prop: string]: any
    }
  }>
  totalFeatures: string
}
export interface GetFeatureInfoParams extends L.WMSOptions {
  map: L.Map
  latlng: L.LatLng
  wmsURL: string
  cql_filter: string
}

export async function getFeatureInfo(
  options: GetFeatureInfoParams
): Promise<FeatureInfo> {
  const url = getFeatureInfoUrl(options)
  const res = await fetch(url, {
    mode: 'cors',
    method: 'GET',
    credentials: 'include',
  })
  return res.json() as Promise<FeatureInfo>
}

export async function getCapabilities(wmsURL: string) {
  const url = getCapabilitiesUrl(wmsURL)
  const jsonData = await fetch(url, {
    mode: 'cors',
    method: 'GET',
    credentials: 'include',
  })
    .then((res) => res.text())
    .then((str) =>
      convert.xml2js(str, {
        compact: true,
      })
    )
  return jsonData as any
}

function getFeatureInfoUrl(options: GetFeatureInfoParams) {
  const { wmsURL, map, latlng, layers, styles, cql_filter } = options
  const point = map.latLngToContainerPoint(latlng)
  const size = map.getSize()
  const params = {
    service: 'WMS',
    version: '1.1.1',
    request: 'GetFeatureInfo',
    layers,
    styles,
    srs: 'EPSG:4326',
    bbox: map.getBounds().toBBoxString(),
    height: size.y,
    width: size.x,
    query_layers: layers,
    x: Math.round(point.x),
    y: Math.round(point.y),
    info_format: 'application/json',
  } as any
  if (!isNothing(cql_filter)) {
    params.cql_filter = cql_filter
  }
  return wmsURL + L.Util.getParamString(params, wmsURL)
}

function getCapabilitiesUrl(wmsURL: string) {
  const params = {
    service: 'WMS',
    version: '1.1.1',
    request: 'GetCapabilities',
  }
  return wmsURL + L.Util.getParamString(params, wmsURL)
}
