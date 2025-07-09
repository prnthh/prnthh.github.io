import { Schema, type, MapSchema } from "@colyseus/schema";

export class Status extends Schema {
  @type("string") currentStatus: string = "";
  @type("number") health: number = 10;
  @type("number") swag: number = 0;
}

export class Position extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") z: number = 0;
}

export class ServerEntity extends Schema {
  @type("string") id: string = "";
  @type("string") name: string = "";
  @type(Position) position: Position = new Position();
}

export class Player extends ServerEntity {
  @type(Status) status: Status = new Status();
  @type("string") type: string = "player";
  @type("string") controller: "human" | "ai" = "human";
}

export class MapEntity extends ServerEntity {
  @type("string") type: string = "mapEntity";
  @type("string") entityType: string = ""; // e.g., "tree", "rock"
  @type("string") subtype: string = ""; // e.g., "oak", "maple"
  @type("boolean") isDepleted: boolean = false; // for resources like trees or rocks
}

export class MyRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: MapEntity }) mapEntities = new MapSchema<MapEntity>();
  // @type("string") mySynchronizedProperty: string = "Hello world"; refer for test
}
