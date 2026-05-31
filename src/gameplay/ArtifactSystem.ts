import { 
  AbstractMesh, 
  Scene, 
  UniversalCamera 
} from "@babylonjs/core";

import type { ArtifactData } from "../types/GameTypes";

export default class ArtifactSystem {
  private artifacts: ArtifactData[] = [];
  private targetedArtifactId?: string;
  private artifactInteractionDistance = 5;
  private collectedArtifacts = 0;
  private totalArtifacts = 5;

  private scene: Scene;
  constructor(scene: Scene) {
    this.scene = scene;
  }

  setupFromMeshes(meshes: AbstractMesh[]): void {
    this.artifacts = [];
    const artifactNames = ["artifact 1", "artifact 2", "artifact 3", "artifact 4", "artifact 5"];

    artifactNames.forEach((artifactName) => {
      const artifactMeshes = meshes.filter((mesh) => mesh.name.startsWith(artifactName));
      if (artifactMeshes.length > 0) {
        this.artifacts.push({ id: artifactName, meshes: artifactMeshes, collected: false });
      }
    });

    this.totalArtifacts = this.artifacts.length;
  }

  updateTargetedArtifact(): string | undefined {
    const camera = this.scene.activeCamera as UniversalCamera;
    const ray = camera.getForwardRay(this.artifactInteractionDistance);

    const hit = this.scene.pickWithRay(ray, (mesh) => {
      return this.artifacts.some((artifact) => !artifact.collected && artifact.meshes.includes(mesh as AbstractMesh));
    });

    if (hit?.hit && hit.pickedMesh) {
      const artifact = this.artifacts.find((a) => a.meshes.includes(hit.pickedMesh as AbstractMesh));
      this.targetedArtifactId = artifact?.id;
      return this.targetedArtifactId;
    }

    this.targetedArtifactId = undefined;
    return undefined;
  }

  collectTargetedArtifact(): boolean {
    if (!this.targetedArtifactId) return false;

    const artifact = this.artifacts.find((a) => a.id === this.targetedArtifactId);
    if (!artifact || artifact.collected) return false;

    artifact.collected = true;
    artifact.meshes.forEach((mesh) => mesh.setEnabled(false));
    this.targetedArtifactId = undefined;
    this.collectedArtifacts++;

    return true;
  }

  reset(): void {
    this.collectedArtifacts = 0;
    this.targetedArtifactId = undefined;

    this.artifacts.forEach((artifact) => {
      artifact.collected = false;
      artifact.meshes.forEach((mesh) => mesh.setEnabled(true));
    });
  }

  getCollectedCount(): number {
    return this.collectedArtifacts;
  }

  getTotalCount(): number {
    return this.totalArtifacts;
  }
}
