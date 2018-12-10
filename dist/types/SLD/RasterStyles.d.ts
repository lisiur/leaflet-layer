import { StylesConfig, Rule, Transformation, Ref } from './def';
import { SLDStyles } from './SLDStyles';
export interface RasterStylesConfig extends StylesConfig {
    gradient: ColorMap[];
    weightAttr: string;
    radius: number;
    pixelsPerCell: number;
}
interface ColorMap {
    color: string;
    quantity: number;
    opacity?: number;
}
export default class RasterStyles extends SLDStyles {
    protected layerName: string;
    protected stylesCfg: RasterStylesConfig;
    constructor(layerName: string, stylesCfg: RasterStylesConfig);
    getRefs(): Ref[];
    protected getRule(stylesCfg: RasterStylesConfig): Rule;
    protected getTransformation(stylesCfg: RasterStylesConfig): Transformation | null;
    private getParameterFunction;
    private getEnvFunction;
    private getRenderRule;
    private getRasterSymbolizerItem;
    private getColorMapEntryItem;
}
export {};
