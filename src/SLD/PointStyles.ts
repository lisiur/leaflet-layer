import {
  Rule,
  RuleItem,
  PointSymbolizerItem,
  PropColorRefs,
  PropSizeRefs,
  RangeSizeRefs,
  RangeColorRefs,
  WellKnownNameItem,
  Transformation,
  Ref,
} from './def'
import { isNothing } from '../utils'
import RasterStyles, { RasterStylesConfig } from './RasterStyles'

const DEFAULT_BUBBLE_FILL_OPACITY = 0.6
export interface PointStylesConfig extends RasterStylesConfig {
  renderType:
    | 'single'
    | 'segmented'
    | 'classified'
    | 'cluster'
    | 'heat'
    | 'bubble'
  iconUrl: string
  iconSize: number
  bubbleColorProp: string
  bubbleColorType: 'prop' | 'range'
  bubbleColors: string[]
  bubbleSizeProp: string
  bubbleSizeType: 'prop' | 'range'
  bubbleSizes: number[]
}

export default class PointStyles extends RasterStyles {
  constructor(
    protected layerName: string,
    protected stylesCfg: PointStylesConfig
  ) {
    super(layerName, stylesCfg)
  }
  public getRefs(): Ref[] {
    switch (this.stylesCfg.renderType) {
      case 'segmented':
      case 'classified': {
        return super.getRefs()
      }
      case 'bubble': {
        return this.getBubbleRefs()
      }
      default: {
        return []
      }
    }
  }
  protected getRule(stylesCfg: PointStylesConfig): Rule {
    switch (stylesCfg.renderType) {
      case 'single': {
        return this.getSingleRenderRule(stylesCfg)
      }
      case 'segmented': {
        return this.getSegmentedRenderRule(stylesCfg)
      }
      case 'classified': {
        return this.getClassifiedRenderRule(stylesCfg)
      }
      case 'heat': {
        return super.getRule(stylesCfg)
      }
      case 'bubble': {
        return this.getBubbleRenderRule(stylesCfg)
      }
      case 'cluster': {
        // TODO
      }
    }
  }
  protected getTransformation(
    stylesCfg: PointStylesConfig
  ): Transformation | null {
    if (stylesCfg.renderType === 'heat') {
      return super.getTransformation(stylesCfg)
    } else {
      return null
    }
  }
  private getBubbleRefs(): Ref[] {
    if (isNothing(this.stylesCfg.bubbleColorType)) {
      return []
    }
    if (isNothing(this.stylesCfg.bubbleSizeType)) {
      return []
    }
    if (isNothing(this.stylesCfg.bubbleSizeProp)) {
      return []
    }
    if (isNothing(this.stylesCfg.bubbleColorProp)) {
      return []
    }
    const colorPropRange = this.stylesCfg.rangeProp[
      this.stylesCfg.bubbleColorProp
    ]
    const sizePropRange = this.stylesCfg.rangeProp[
      this.stylesCfg.bubbleSizeProp
    ]
    const colorSizeRange = this.stylesCfg.rangeSize[
      this.stylesCfg.bubbleColorProp
    ]
    const sizeSizeRange = this.stylesCfg.rangeSize[
      this.stylesCfg.bubbleSizeProp
    ]

    const propColorRefs =
      (colorPropRange &&
        this.getPropColorRefs(colorPropRange, this.stylesCfg.bubbleColors)) ||
      []
    const propSizeRefs =
      (sizePropRange &&
        this.getPropSizeRefs(sizePropRange, this.stylesCfg.bubbleSizes)) ||
      []
    const rangeColorRefs =
      (colorSizeRange &&
        this.getRangeColorRefs(colorSizeRange, this.stylesCfg.bubbleColors)) ||
      []
    const rangeSizeRefs =
      (sizeSizeRange &&
        this.getRangeSizeRefs(sizeSizeRange, this.stylesCfg.bubbleSizes)) ||
      []
    const translatedPropColorRefs = propColorRefs.map((item) =>
      this.translateOtherProp(item)
    )
    const translatedPropSizeRefs = propSizeRefs.map((item) =>
      this.translateOtherProp(item)
    )
    if (
      this.stylesCfg.bubbleColorType === 'prop' &&
      this.stylesCfg.bubbleSizeType === 'prop'
    ) {
      return [].concat(translatedPropColorRefs).concat(translatedPropSizeRefs)
    }
    if (
      this.stylesCfg.bubbleColorType === 'prop' &&
      this.stylesCfg.bubbleSizeType === 'range'
    ) {
      return [].concat(translatedPropColorRefs).concat(rangeSizeRefs)
    }
    if (
      this.stylesCfg.bubbleColorType === 'range' &&
      this.stylesCfg.bubbleSizeType === 'prop'
    ) {
      return [].concat(rangeColorRefs).concat(translatedPropSizeRefs)
    }
    if (
      this.stylesCfg.bubbleColorType === 'range' &&
      this.stylesCfg.bubbleSizeType === 'range'
    ) {
      return [].concat(rangeColorRefs).concat(rangeSizeRefs)
    }
  }
  private getSingleRenderRule(stylesCfg: PointStylesConfig): Rule {
    if (isNothing(stylesCfg.fill)) {
      throw this.sldError(`invalid PointStylesConfig.fill: ${stylesCfg.fill}`)
    }
    if (isNothing(stylesCfg.iconSize)) {
      throw this.sldError(
        `invalid PointStylesConfig.iconSize: ${stylesCfg.iconSize}`
      )
    }
    return [
      {
        PointSymbolizer: [
          this.getPointSymbolizerItemUsingOnlineResource(
            stylesCfg.iconUrl,
            stylesCfg.fill,
            stylesCfg.iconSize
          ),
        ],
      },
    ]
  }

  private getSegmentedRenderRule(stylesCfg: PointStylesConfig): Rule {
    if (isNothing(stylesCfg.rangeSize)) {
      throw this.sldError(
        `invalid PointStylesConfig.rangeSize: ${stylesCfg.rangeSize}`
      )
    }
    if (isNothing(stylesCfg.segmentedProp)) {
      throw this.sldError(
        `invalid PointStylesConfig.segmentedProp: ${stylesCfg.segmentedProp}`
      )
    }
    const sizeRange = stylesCfg.rangeSize[stylesCfg.segmentedProp]
    if (isNothing(sizeRange)) {
      throw this.sldError(
        `invalid PointStylesConfig.rangeSize[${
          stylesCfg.segmentedProp
        }]: ${sizeRange}`
      )
    }
    return this.getRangeColorRefs(sizeRange, stylesCfg.segmentedColors).map(
      (ref) => {
        return {
          Filter: this.getRangeFilter(stylesCfg.segmentedProp, ref.range),
          PointSymbolizer: [
            this.getPointSymbolizerItemUsingOnlineResource(
              stylesCfg.iconUrl,
              ref.color,
              stylesCfg.iconSize
            ),
          ],
        } as RuleItem
      }
    )
  }

  private getClassifiedRenderRule(stylesCfg: PointStylesConfig): Rule {
    if (isNothing(stylesCfg.rangeProp)) {
      throw this.sldError(
        `invalid PointStylesConfig.rangeProp: ${stylesCfg.rangeProp}`
      )
    }
    if (isNothing(stylesCfg.classifiedProp)) {
      throw this.sldError(
        `invalid PointStylesConfig.classifiedProp: ${stylesCfg.classifiedProp}`
      )
    }
    const propRange = stylesCfg.rangeProp[stylesCfg.classifiedProp]
    if (isNothing(propRange)) {
      throw this.sldError(
        `invalid PointStylesConfig.rangeProp[${
          stylesCfg.classifiedProp
        }]: ${propRange}`
      )
    }
    return this.getPropColorRefs(propRange, stylesCfg.classifiedColors).map(
      (ref) => {
        return {
          Filter: this.getTypeFilter(stylesCfg.classifiedProp, ref.prop),
          PointSymbolizer: [
            this.getPointSymbolizerItemUsingOnlineResource(
              stylesCfg.iconUrl,
              ref.color,
              stylesCfg.iconSize
            ),
          ],
        } as RuleItem
      }
    )
  }

  private getBubbleRenderRule(stylesCfg: PointStylesConfig): Rule {
    if (isNothing(stylesCfg.bubbleColorType)) {
      throw this.sldError(
        `invalid PointStylesConfig.bubbleColorType: ${
          stylesCfg.bubbleColorType
        }`
      )
    }
    if (isNothing(stylesCfg.bubbleSizeType)) {
      throw this.sldError(
        `invalid PointStylesConfig.bubbleSizeType: ${stylesCfg.bubbleSizeType}`
      )
    }
    if (isNothing(stylesCfg.bubbleSizeProp)) {
      throw this.sldError(
        `invalid PointStylesConfig.bubbleSizeProp: ${stylesCfg.bubbleSizeProp}`
      )
    }
    if (isNothing(stylesCfg.bubbleColorProp)) {
      throw this.sldError(
        `invalid PointStylesConfig.bubbleColorProp: ${
          stylesCfg.bubbleColorProp
        }`
      )
    }
    const colorPropRange = stylesCfg.rangeProp[stylesCfg.bubbleColorProp]
    const sizePropRange = stylesCfg.rangeProp[stylesCfg.bubbleSizeProp]
    const colorSizeRange = stylesCfg.rangeSize[stylesCfg.bubbleColorProp]
    const sizeSizeRange = stylesCfg.rangeSize[stylesCfg.bubbleSizeProp]

    const propColorRefs =
      (colorPropRange &&
        this.getPropColorRefs(colorPropRange, stylesCfg.bubbleColors)) ||
      []
    const propSizeRefs =
      (sizePropRange &&
        this.getPropSizeRefs(sizePropRange, stylesCfg.bubbleSizes)) ||
      []
    const rangeColorRefs =
      (colorSizeRange &&
        this.getRangeColorRefs(colorSizeRange, stylesCfg.bubbleColors)) ||
      []
    const rangeSizeRefs =
      (sizeSizeRange &&
        this.getRangeSizeRefs(sizeSizeRange, stylesCfg.bubbleSizes)) ||
      []
    if (
      stylesCfg.bubbleColorType === 'prop' &&
      stylesCfg.bubbleSizeType === 'prop'
    ) {
      return this.colorPropXSizeProp(
        stylesCfg.bubbleColorProp,
        propColorRefs,
        stylesCfg.bubbleSizeProp,
        propSizeRefs
      )
    }
    if (
      stylesCfg.bubbleColorType === 'prop' &&
      stylesCfg.bubbleSizeType === 'range'
    ) {
      return this.colorPropXSizeRange(
        stylesCfg.bubbleColorProp,
        propColorRefs,
        stylesCfg.bubbleSizeProp,
        rangeSizeRefs
      )
    }
    if (
      stylesCfg.bubbleColorType === 'range' &&
      stylesCfg.bubbleSizeType === 'prop'
    ) {
      return this.colorRangeXSizeProp(
        stylesCfg.bubbleColorProp,
        rangeColorRefs,
        stylesCfg.bubbleSizeProp,
        propSizeRefs
      )
    }
    if (
      stylesCfg.bubbleColorType === 'range' &&
      stylesCfg.bubbleSizeType === 'range'
    ) {
      return this.colorRangeXSizeRange(
        stylesCfg.bubbleColorProp,
        rangeColorRefs,
        stylesCfg.bubbleSizeProp,
        rangeSizeRefs
      )
    }
  }

  private colorPropXSizeProp(
    colorPropName: string,
    propColorRefs: PropColorRefs,
    sizePropName: string,
    propSizeRefs: PropSizeRefs
  ): Rule {
    const rule: Rule = []
    for (const propColorRef of propColorRefs) {
      for (const propSizeRef of propSizeRefs) {
        rule.push({
          Filter: {
            And: [
              this.getTypeFilter(colorPropName, propColorRef.prop),
              this.getTypeFilter(sizePropName, propSizeRef.prop),
            ],
          },
          PointSymbolizer: [
            this.getPointSymbolizerItemUsingMark({
              name: 'circle',
              fill: propColorRef.color,
              size: propSizeRef.size,
            }),
          ],
        })
      }
    }
    return rule
  }

  private colorPropXSizeRange(
    colorPropName: string,
    propColorRefs: PropColorRefs,
    sizePropName: string,
    rangeSizeRefs: RangeSizeRefs
  ): Rule {
    const rule: Rule = []
    for (const propColorRef of propColorRefs) {
      for (const rangeSizeRef of rangeSizeRefs) {
        rule.push({
          Filter: {
            And: {
              And: [
                this.getTypeFilter(colorPropName, propColorRef.prop),
                this.getRangeFilter(sizePropName, rangeSizeRef.range),
              ],
            },
          },
          PointSymbolizer: [
            this.getPointSymbolizerItemUsingMark({
              name: 'circle',
              fill: propColorRef.color,
              size: rangeSizeRef.size,
            }),
          ],
        })
      }
    }
    return rule
  }

  private colorRangeXSizeProp(
    colorPropName: string,
    rangeColorRefs: RangeColorRefs,
    sizePropName: string,
    propSizeRefs: PropSizeRefs
  ): Rule {
    const rule: Rule = []
    for (const rangeColorRef of rangeColorRefs) {
      for (const propSizeRef of propSizeRefs) {
        rule.push({
          Filter: {
            And: [
              this.getRangeFilter(colorPropName, rangeColorRef.range),
              this.getTypeFilter(sizePropName, propSizeRef.prop),
            ],
          },
          PointSymbolizer: [
            this.getPointSymbolizerItemUsingMark({
              name: 'circle',
              fill: rangeColorRef.color,
              size: propSizeRef.size,
            }),
          ],
        })
      }
    }
    return rule
  }

  private colorRangeXSizeRange(
    colorPropName: string,
    rangeColorRefs: RangeColorRefs,
    sizePropName: string,
    rangeSizeRefs: RangeSizeRefs
  ): Rule {
    const rule: Rule = []
    for (const rangeColorRef of rangeColorRefs) {
      for (const rangeSizeRef of rangeSizeRefs) {
        rule.push({
          Filter: {
            And: [
              this.getRangeFilter(colorPropName, rangeColorRef.range),
              this.getRangeFilter(sizePropName, rangeSizeRef.range),
            ],
          },
          PointSymbolizer: [
            this.getPointSymbolizerItemUsingMark({
              name: 'circle',
              fill: rangeColorRef.color,
              size: rangeSizeRef.size,
            }),
          ],
        })
      }
    }
    return rule
  }

  private getPointSymbolizerItemUsingMark(params: {
    name: WellKnownNameItem
    fill: string
    fillOpacity?: number
    size: number
  }): PointSymbolizerItem {
    return {
      Graphic: {
        Mark: {
          WellKnownName: {
            _text: params.name,
          },
          Fill: {
            CssParameter: this.getFillCssParameters({
              fill: params.fill,
              fillOpacity: params.fillOpacity || DEFAULT_BUBBLE_FILL_OPACITY,
            }),
          },
        },
        Size: {
          _text: params.size,
        },
      },
    }
  }

  private getPointSymbolizerItemUsingOnlineResource(
    iconUrl: string,
    fill: string,
    size: number
  ): PointSymbolizerItem {
    return {
      Graphic: {
        ExternalGraphic: {
          OnlineResource: {
            _attributes: {
              'xlink:type': 'simple',
              'xlink:href': `${iconUrl}?color=${fill.slice(1)}`,
            },
          },
          Format: {
            _text: 'image/svg',
          },
        },
        Size: {
          _text: size,
        },
      },
    }
  }
}
