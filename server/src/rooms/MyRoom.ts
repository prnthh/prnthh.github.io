import { Room, Client } from "@colyseus/core";
import { MapEntity, MyRoomState, Player, Position } from "./schema/MyRoomState";
import GameTickEngine from "../GameTickEngine";

export class MyRoom extends Room<MyRoomState> {
  state = new MyRoomState();
  GameTickEngine!: GameTickEngine;

  onCreate (options: any) {
    this.GameTickEngine = new GameTickEngine(this.state);
    this.initRoomEntities();
    this.onMessage("chat", (client, data) => {
      this.broadcast("chat", { text: data.text, from: client.sessionId });
    });
    this.onMessage("command", (client, data) => {
      if (typeof data.text === "string") {
        client.send("command", { text: data.text, from: "server" });
        this.GameTickEngine.setPlayerAction(client.sessionId, data.text);
      }
    });
  }

  private initRoomEntities() {
    const resourceTypes = [
      { entityType: "tree", subtype: "oak" },
      { entityType: "tree", subtype: "maple" },
      { entityType: "rock", subtype: "granite" },
      { entityType: "rock", subtype: "limestone" }
    ];
    const npcTypes = [
      { entityType: "npc", subtype: "villager" },
      { entityType: "npc", subtype: "merchant" },
      { entityType: "npc", subtype: "guard" },
      { entityType: "npc", subtype: "wanderer" }
    ];
    // Helper to generate random position
    function randomPosition() {
      return { x: Math.random() * 20 - 10, y: 0, z: Math.random() * 20 - 10 };
    }
    // Add resources
    for (let i = 0; i < 9; i++) {
      const type = resourceTypes[i % resourceTypes.length];
      const resource = new MapEntity();
      resource.id = `resource_${i}_${Date.now()}`;
      resource.name = type.entityType + '_' + type.subtype;
      resource.entityType = type.entityType;
      resource.subtype = type.subtype;
      resource.position = new Position();
      Object.assign(resource.position, randomPosition());
      this.state.mapEntities.set(resource.id, resource);
    }
    // Add NPCs
    for (let i = 0; i < 4; i++) {
      const npcPlayer = new Player();
      npcPlayer.id = `npc_${i}_${Date.now()}`;
      npcPlayer.name = npcTypes[i].entityType + '_' + npcTypes[i].subtype;
      npcPlayer.position = new Position();
      Object.assign(npcPlayer.position, randomPosition());
      npcPlayer.controller = "ai"; // Set controller to 'ai' for NPCs
      this.state.players.set(npcPlayer.id, npcPlayer);
      // Initialize entityState for AI so they are ticked
      this.GameTickEngine.setPlayerAction(npcPlayer.id, undefined);
    }
  }
  
  onJoin (client: Client, options: any) {
    const player = new Player();
    player.id = client.sessionId;
    player.name = "Player " + client.sessionId.slice(0, 4);
    this.state.players.set(client.sessionId, player);
    console.log(client.sessionId, "joined!");
    // Send a private welcome message to the joining client
    client.send("chat", { text: `Welcome to room ${this.roomId}`, from: "server" });
  }
  
  onLeave (client: Client, consented: boolean) {
    this.state.players.delete(client.sessionId);
    console.log(client.sessionId, "left!");
  }
  
  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }
}