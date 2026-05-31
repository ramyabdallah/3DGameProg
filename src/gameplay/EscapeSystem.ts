import { 
  UniversalCamera, 
  Vector3 
} from "@babylonjs/core";

export default class EscapeSystem {
  private allArtifactsCollected = false;
  private escapePosition = new Vector3(0, 5, 35);
  private escapeDistance = 10;

  private camera: UniversalCamera; 
  private onEscape: () => void;
  constructor(camera: UniversalCamera, onEscape: () => void) {
    this.camera = camera;
    this.onEscape = onEscape;
  }

  setAllArtifactsCollected(): void {
    this.allArtifactsCollected = true;
  }

  update(): void {
    if (!this.allArtifactsCollected) return;

    const distanceToExit = Vector3.Distance(this.camera.position, this.escapePosition);
    if (distanceToExit < this.escapeDistance) {
      this.onEscape();
    }
  }

  reset(): void {
    this.allArtifactsCollected = false;
  }
}
