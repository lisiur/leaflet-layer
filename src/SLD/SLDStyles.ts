import * as convert from 'xml-js'
import {
  StylesConfig,
  IStyles,
  Styles,
  Rule,
  UserStyle,
  CssParameter,
  CssParameterItem,
  CssParameterItemName,
  XMLBaseDeclaration,
  StyledLayerDescriptorBaseAttributes,
  RangeColorRef,
  RangeColorRefs,
  RangeSizeRefs,
  RangeSizeRef,
  PropColorRefs,
  PropColorRef,
  PropSizeRefs,
  PropSizeRef,
  Filter,
} from './def'
import { isUndefined } from '../utils'

const OTHERS_DEFAULT_PROP = '__others__=>'
const OTHERS_DEFAULT_COLOR = '#3388ff'
const OTHERS_DEFAULT_SIZE = 10

export abstract class SLDStyles implements IStyles {
  constructor(protected layerName: string, protected stylesCfg: StylesConfig) {}
  public toXMLStr(): string {
    return convert.js2xml(this.getSLDStyles(this.layerName, this.stylesCfg), {
      compact: true,
      spaces: '\t',
      elementNameFn: (name) => {
        if (
          [
            'Filter',
            'And',
            'Or',
            'Not',
            'PropertyName',
            'Literal',
            'PropertyIsLike',
            'PropertyIsLessThan',
            'PropertyIsEqualTo',
            'PropertyIsNotEqualTo',
            'PropertyIsGreaterThan',
            'PropertyIsLessThanOrEqualTo',
            'PropertyIsGreaterThanOrEqualTo',
          ].includes(name)
        ) {
          return `ogc:${name}`
        } else {
          return name
        }
      },
    })
  }
  public getStylesConfig() {
    return this.stylesCfg
  }
  public getLayers() {
    return this.layerName
  }
  protected abstract getRule(stylesCfg: StylesConfig): Rule
  protected getUserStyles(stylesCfg: StylesConfig): UserStyle {
    return [
      {
        FeatureTypeStyle: [
          {
            Rule: this.getRule(stylesCfg),
          },
        ],
      },
    ]
  }

  protected getSLDStyles(layerName: string, stylesCfg: StylesConfig): Styles {
    return {
      _declaration: XMLBaseDeclaration,
      StyledLayerDescriptor: {
        _attributes: StyledLayerDescriptorBaseAttributes,
        NamedLayer: {
          Name: {
            _text: layerName,
          },
          UserStyle: this.getUserStyles(stylesCfg),
        },
      },
    }
  }

  protected getFillCssParameters(stylesCfg: StylesConfig): CssParameter {
    const slashKeys = ['fill', 'fill-opacity'] as CssParameterItemName[]
    return this.getCssParameterItems(slashKeys, stylesCfg)
  }

  protected getFontCssParameters(stylesCfg: StylesConfig): CssParameter {
    const slashKeys = [
      'font-family',
      'font-size',
      'font-style',
      'font-weight',
    ] as CssParameterItemName[]
    return this.getCssParameterItems(slashKeys, stylesCfg)
  }

  protected getStrokeCssParameters(stylesCfg: StylesConfig): CssParameter {
    const slashKeys = ['stroke', 'stroke-opacity'] as CssParameterItemName[]
    return this.getCssParameterItems(slashKeys, stylesCfg)
  }

  protected sldError(msg: string) {
    return new Error(`[sld] ${msg}`)
  }

  protected getRangeColorRefs(
    range: [number, number],
    colors: string[]
  ): RangeColorRefs {
    const minVal = range[0]
    const maxVal = range[1]
    const steps = colors.length
    const step = (maxVal - minVal) / steps
    return colors.map((color, index) => {
      return {
        range: [minVal + step * index, minVal + step * (index + 1)],
        color,
      } as RangeColorRef
    })
  }

  protected getRangeSizeRefs(
    range: [number, number],
    sizes: number[]
  ): RangeSizeRefs {
    const minVal = range[0]
    const maxVal = range[1]
    const steps = sizes.length
    const step = (maxVal - minVal) / steps
    return sizes.map((size, index) => {
      return {
        range: [minVal + step * index, minVal + step * (index + 1)],
        size,
      } as RangeSizeRef
    })
  }

  protected getPropColorRefs(props: string[], colors: string[]): PropColorRefs {
    const refs = props
      .slice(0, Math.min(props.length, colors.length))
      .map((prop, index) => {
        return {
          prop,
          color: colors[index],
        } as PropColorRef
      })
    if (props.length > colors.length) {
      refs.push({
        prop: this.stringifyOtherProps(props.slice(0, colors.length)),
        color: OTHERS_DEFAULT_COLOR,
      } as PropColorRef)
    }
    return refs
  }

  protected getPropSizeRefs(props: string[], sizes: number[]): PropSizeRefs {
    const refs = props
      .slice(0, Math.min(props.length, sizes.length))
      .map((prop, index) => {
        return {
          prop,
          size: sizes[index],
        } as PropSizeRef
      })
    if (props.length > sizes.length) {
      refs.push({
        prop: this.stringifyOtherProps(props.slice(0, sizes.length)),
        size: OTHERS_DEFAULT_SIZE,
      } as PropSizeRef)
    }
    return refs
  }

  protected getRangeFilter(prop: string, range: [number, number]): Filter {
    return {
      And: {
        PropertyIsGreaterThanOrEqualTo: {
          PropertyName: {
            _text: prop,
          },
          Literal: {
            _text: range[0],
          },
        },
        PropertyIsLessThan: {
          PropertyName: {
            _text: prop,
          },
          Literal: {
            _text: range[1],
          },
        },
      },
    }
  }

  protected getTypeFilter(prop: string, value: any): Filter {
    if (this.isOtherPropRef(value)) {
      const props = this.parseOtherProps(value)
      return this.getTypeNotInFilter(prop, props)
    } else {
      return {
        PropertyIsEqualTo: {
          PropertyName: {
            _text: prop,
          },
          Literal: {
            _text: value,
          },
        },
      }
    }
  }

  private getTypeNotInFilter(prop: string, values: any[]): Filter {
    return {
      And: {
        PropertyIsNotEqualTo: values.map((value) => ({
          PropertyName: {
            _text: prop,
          },
          Literal: {
            _text: value,
          },
        })),
      },
    }
  }

  private isOtherPropRef(prop: string) {
    return prop.startsWith(OTHERS_DEFAULT_PROP)
  }

  private stringifyOtherProps(props: string[]) {
    return `${OTHERS_DEFAULT_PROP}${JSON.stringify(props)}`
  }

  private parseOtherProps(prop: string): string[] {
    if (this.isOtherPropRef(prop)) {
      return JSON.parse(prop.slice(OTHERS_DEFAULT_PROP.length)) as string[]
    } else {
      return []
    }
  }

  /** get valuable config */
  private getCssParameterItems(
    keys: CssParameterItemName[],
    stylesCfg: StylesConfig
  ): CssParameter {
    return keys
      .map(this.slash2Camel) // transform to camel style key
      .map(
        (key, index) =>
          [keys[index], stylesCfg[key as keyof StylesConfig]] as [
            CssParameterItemName,
            number
          ]
      ) // transform to [slash style key, value]
      .filter(([_, val]) => !isUndefined(val)) // remove undefined value pair
      .map(([key, val]) => this.getCssParameterItem(key, val))
  }

  /** get specified key/value CssParameterItem */
  private getCssParameterItem(
    key: CssParameterItemName,
    value: any
  ): CssParameterItem {
    return {
      _attributes: {
        name: key,
      },
      _text: value,
    }
  }

  /** transform slash var to camel style */
  private slash2Camel(v: string): string {
    const vItems: string[] = []
    for (let i = 0; i < v.length; i++) {
      if (v[i] === '-') {
        i += 1
        if (i < v.length) {
          vItems.push(v[i].toUpperCase())
        }
      } else {
        vItems.push(v[i])
      }
    }
    return vItems.join()
  }
}