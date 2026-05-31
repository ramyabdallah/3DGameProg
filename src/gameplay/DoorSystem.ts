import { 
  AnimationGroup, 
  AbstractMesh, 
  Scene, 
  UniversalCamera 
} from "@babylonjs/core";

import type { DoorData } from "../types/GameTypes";
import type AudioManager from "../audio/AudioManager";

export default class DoorSystem {
  private doors: DoorData[] = [];
  private doorInteractionDistance = 8;
  private secondFloorTriggered = false;

  private scene: Scene; 
  private audio: AudioManager;
  private onSecondFloorDoorOpened: () => void;
  constructor(scene: Scene, onSecondFloorDoorOpened: () => void, audio: AudioManager) {
    this.scene = scene;
    this.audio = audio;
    this.onSecondFloorDoorOpened = onSecondFloorDoorOpened;
  }

  setupDoors(meshes: AbstractMesh[], animationGroups: AnimationGroup[]): void {
    const doorMeshes = meshes
      .filter((mesh) => /^Door(\.\d+)?$/i.test(mesh.name))
      .sort((a, b) => this.getDoorNumber(a.name) - this.getDoorNumber(b.name));

    const doorActions = animationGroups
      .filter((group) => group.name.startsWith("DoorAction"))
      .sort((a, b) => this.getDoorNumber(a.name) - this.getDoorNumber(b.name));

    this.doors = doorMeshes.map((doorMesh, index) => {
      const doorAction = doorActions[index];

      if (!doorAction) {
        return { meshName: doorMesh.name, animationGroups: [], isOpen: false, isAnimating: false };
      }

      const suffix = doorAction.name.match(/\.\d+$/)?.[0] ?? "";
      const relatedAnimations = animationGroups.filter((group) => group.name.endsWith(suffix));

      relatedAnimations.forEach((group) => {
        group.stop();
        group.reset();
      });

      return { meshName: doorMesh.name, animationGroups: relatedAnimations, isOpen: false, isAnimating: false };
    });
  }

  tryToggleDoor(): void {
    const camera = this.scene.activeCamera as UniversalCamera;
    const ray = camera.getForwardRay(this.doorInteractionDistance);

    const hit = this.scene.pickWithRay(ray, (mesh) => /^Door(\.\d+)?$/i.test(mesh.name));
    if (!hit?.hit || !hit.pickedMesh) return;

    const door = this.doors.find((d) => d.meshName === hit.pickedMesh!.name);
    if (!door) {
      console.warn("Door not registered:", hit.pickedMesh.name);
      return;
    }

    if (door.isAnimating || door.animationGroups.length === 0) return;

    door.isAnimating = true;
    const mainDoorAnimation = door.animationGroups.find((ag) => ag.name.startsWith("DoorAction"));
    if (!mainDoorAnimation) return;

    const from = door.isOpen ? mainDoorAnimation.to : mainDoorAnimation.from;
    const to = door.isOpen ? mainDoorAnimation.from : mainDoorAnimation.to;

    door.animationGroups.forEach((group) => {
      group.stop();
      group.start(false, 1.0, from, to, false);
    });

    door.isOpen = !door.isOpen;
    this.audio.playDoorSound();

    if (!this.secondFloorTriggered && (door.meshName === "Door.006" || door.meshName === "Door.007")) {
      this.secondFloorTriggered = true;
      window.setTimeout(() => this.onSecondFloorDoorOpened(), 5000);
    }

    window.setTimeout(() => {
      door.isAnimating = false;
    }, 1600);
  }

  reset(): void {
    this.secondFloorTriggered = false;

    this.doors.forEach((door) => {
      door.isOpen = false;
      door.isAnimating = false;
      door.animationGroups.forEach((group) => {
        group.stop();
        group.reset();
      });
    });
  }

  private getDoorNumber(name: string): number {
    const match = name.match(/\.(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  }
}
