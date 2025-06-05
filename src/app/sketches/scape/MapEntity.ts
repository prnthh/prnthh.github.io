// Types for map entities (trees, ores)

export type TreeType = "normal" | "star" | "heart" | "earth";
export type OreType = "copper" | "tin" | "iron" | "coal";

export type MapEntityType =
  | { kind: "tree"; treeType: TreeType }
  | { kind: "ore"; oreType: OreType };

export interface MapEntity {
  id: string;
  type: MapEntityType;
  pos: [number, number];
  resourceAmount: number; // current available resource
  maxResource: number; // max resource
  depleted: boolean;
  replenishTicksLeft: number; // ticks until replenished if depleted
}
