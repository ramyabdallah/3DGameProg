import { 
  AbstractMesh, 
  ImportMeshAsync, 
  Scene, 
  Vector3,
  Color3,
  StandardMaterial
} from "@babylonjs/core";

import DoorSystem from "./DoorSystem";
import ArtifactSystem from "./ArtifactSystem";
import MonsterController from "../monster/MonsterController";

export default class ArchiveLoader {
  public collisionMeshes: AbstractMesh[] = [];

  
  private scene: Scene;
  private doorSystem: DoorSystem;
  private artifactSystem: ArtifactSystem;
  private monsterController: MonsterController;
  constructor(
    scene: Scene,
    doorSystem: DoorSystem,
    artifactSystem: ArtifactSystem,
    monsterController: MonsterController
  ) {
    this.scene = scene;
    this.doorSystem = doorSystem;
    this.artifactSystem = artifactSystem;
    this.monsterController = monsterController;
  }

  async load(): Promise<void> {
    try {
      const result = await ImportMeshAsync("/assets/models/archive.glb", this.scene);

      result.animationGroups.forEach((animationGroup) => {
        animationGroup.stop();
        animationGroup.reset();
      });

      const meshes = result.meshes.filter((mesh) => mesh instanceof AbstractMesh) as AbstractMesh[];
      this.setupNeonLetterFlicker(meshes);

      this.doorSystem.setupDoors(meshes, result.animationGroups);

      const warningSign = meshes.find((mesh) =>
        mesh.name.toLowerCase().includes("warning")
      );

      if (warningSign) {
        const warningMaterial = new StandardMaterial(
          "warningMaterial",
          this.scene
        );

        warningMaterial.diffuseColor = new Color3(0.8, 0.05, 0.05);
        warningMaterial.emissiveColor = new Color3(0.25, 0.02, 0.02);
        warningMaterial.specularColor = new Color3(0, 0, 0);

        warningSign.material = warningMaterial;
      }

      const importedRoot = result.meshes.find((mesh) => mesh.name === "__root__") ?? result.meshes[0];
      importedRoot.position = new Vector3(0, 0, 80);
      importedRoot.scaling = new Vector3(-1, 1, 1);
      importedRoot.rotation = new Vector3(0, Math.PI, 0);

      this.collisionMeshes = meshes.filter((mesh) => {
        const name = mesh.name.toLowerCase();

        return (
          name.includes("wall") ||
          name.includes("floor") ||
          name.includes("door") ||
          name.includes("doorframe") ||
          name.includes("building") ||
          name.includes("tower") ||
          name.includes("stairs") ||
          name.includes("walkway") ||
          name.includes("base") ||
          name.includes("block") ||
          name.includes("debris") ||
          name.includes("ventilation") ||
          name.includes("pipe") ||
          name.includes("letter") ||
          name.includes("bookshelf") ||
          name.includes("bed") ||
          name.includes("table") ||
          name.includes("chair") ||
          name.includes("monitor") ||
          name.includes("computer") ||
          name.includes("shelf") ||
          name.includes("drawer") ||
          name.includes("body") ||
          name.includes("maw") ||
          name.includes("lockers") ||
          name.includes("locker") ||
          name.includes("cabinet") ||
          name.includes("oxygen") ||
          name.includes("container") ||
          name.includes("shelves") ||
          name.includes("cube") ||
          name.includes("object")
        );
      });

      this.artifactSystem.setupFromMeshes(meshes);

      const monster = result.meshes.find((mesh) => mesh.name.toLowerCase().includes("drowned maw")) as AbstractMesh | undefined;
      const monsterAnimation = result.animationGroups.find((ag) => ag.name === "dolphin-kick-idle");
      this.monsterController.setup(monster, monsterAnimation);
    } catch (error) {
      console.error("Failed to load archive model:", error);
    }
  }

  private setupNeonLetterFlicker(meshes: AbstractMesh[]): void {
    const letters = meshes.filter((mesh) =>
      mesh.name.toLowerCase().startsWith("letter")
    );

    letters.forEach((letter) => {

      const material = letter.material as StandardMaterial | null;

      if (!material) return;

      const baseColor = material.emissiveColor.clone();

      const flicker = () => {

        const nextDelay =
          500 +
          Math.random() * 4000;

        window.setTimeout(() => {

          material.emissiveColor = baseColor.scale(0.1);

          window.setTimeout(() => {
            material.emissiveColor = baseColor;
            flicker();
          }, 50 + Math.random() * 150);

        }, nextDelay);

      };

      flicker();

    });
  }
}
