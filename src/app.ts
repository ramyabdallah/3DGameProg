import {
  Engine,
  Scene,
  Vector3,
  Color3,
  UniversalCamera,
  HemisphericLight,
  PointLight,
  SpotLight,
  MeshBuilder,
  StandardMaterial,
  ImportMeshAsync,
  AbstractMesh,
  AnimationGroup,
  VertexBuffer,
  Texture,
  GlowLayer,
  ParticleSystem,
  Ray,
} from "@babylonjs/core";
import "@babylonjs/loaders";

import UI from "./ui";

export default class App {
  private canvas: HTMLCanvasElement;
  private engine: Engine;
  private scene!: Scene;
  private terrain!: any;
  private minHeightAboveTerrain = 1.2;

  //For invisible wall handling
  private worldMinX = -120;
  private worldMaxX = 120;
  private worldMinZ = -80;
  private worldMaxZ = 170;
  private worldMinY = -5;
  private worldMaxY = 120;

  //collision handling
  private collisionMeshes: AbstractMesh[] = [];
  private wallCollisionDistance = 1.2;

  // Door interaction
  private doorInteractionDistance = 8;
  private doors: {
    meshName: string;
    animationGroups: AnimationGroup[];
    isOpen: boolean;
    isAnimating: boolean;
  }[] = [];

  // UI
  private ui!: UI;

  // Oxygen
  private maxOxygen = 100;
  private oxygen = 100;

  // Artifacts
  private totalArtifacts = 5;
  private collectedArtifacts = 0;
  private collectPressed = false;

  private artifacts: {
    id: string;
    meshes: AbstractMesh[];
    collected: boolean;
  }[] = [];

  private targetedArtifactId?: string;
  private artifactInteractionDistance = 5;

  // Audio
  private baseAmbienceAudio?: HTMLAudioElement;
  private artifactEscalationAudio?: HTMLAudioElement;
  private creatureChaseAudio?: HTMLAudioElement;
  private escalationPlayed = false;
  private secondFloorTriggered = false;
  private creatureDetected = false;
  private mawRoarAudio?: HTMLAudioElement;
  private mawLowRoarAudio?: HTMLAudioElement;
  private mawRoarInterval?: number;
  private mawLowRoarPlayed = false;



  //Monster chase
  private monsterStartPosition?: Vector3;
  private monsterStartRotation?: Vector3;
  private monster?: AbstractMesh;
  private monsterChaseStarted = false;
  private monsterSpeed = 5.0;
  private monsterCatchDistance = 2.2;
  private monsterPathUpdateTimer = 0;
  private monsterFloorOffset = 3.0;
  private monsterWaypoints: Vector3[] = [];
  private monsterWaypointLinks: number[][] = [];
  private monsterPath: number[] = [];


  private allArtifactsCollected = false;
  private escapePosition = new Vector3(0, 5, 35);
  private escapeDistance = 10;


  private gameEnded = false;
  private gameStarted = false;
  private gamePaused = false;
  private startPosition = new Vector3(0, 2, -10);

  private keys: Record<string, boolean> = {};

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.id = "gameCanvas";
    document.body.appendChild(this.canvas);

    this.engine = new Engine(this.canvas, true);
  }

  start(): void {
    this.scene = this.createScene();
    this.ui = new UI(() => this.restartGame());

    this.ui.showMainMenu(
      () => {
        this.gameStarted = true;
        this.gamePaused = false;
        this.ui.hideMainMenu();
        this.playBaseAmbience();
        this.canvas.requestPointerLock();
      },
      () => {
        this.ui.showControlsPanel();
      },
      () => {
        this.ui.showContextPanel();
      }
    );

    this.ui.updateArtifacts(this.collectedArtifacts, this.totalArtifacts);

    this.setupInput();

    this.engine.runRenderLoop(() => {
      if(!this.gameEnded && this.gameStarted && !this.gamePaused) {  
        this.updatePlayerMovement();
        this.updateMonsterChase();
        this.ui.setChaseEffect(this.monsterChaseStarted);
        this.updateOxygen();
        this.checkEscapeWinCondition();
        const targetedArtifact = this.updateTargetedImportedArtifact();

        if (targetedArtifact) {
          this.ui.showInteractionPrompt();
        } else {
          this.ui.hideInteractionPrompt();
        }

        if (this.collectPressed && targetedArtifact) {
          const collected = this.collectImportedArtifact();

          if (collected) {
            this.collectedArtifacts++;

            //escalation music trigger after collecting 2 artifacts, only if creature not already detected
            if (
              this.collectedArtifacts >= 2 &&
              !this.escalationPlayed &&
              !this.creatureDetected &&
              !this.monsterChaseStarted
            ) {
              this.escalationPlayed = true;
              this.playMawLowRoar();

              // Stop base ambience permanently until chase starts
              this.baseAmbienceAudio?.pause();

              if (this.baseAmbienceAudio) {
                this.baseAmbienceAudio.currentTime = 0;
              }

              // Play escalation and let it continue until chase starts
              this.playArtifactEscalation();
            }

            this.ui.updateArtifacts(this.collectedArtifacts, this.totalArtifacts);

            if (this.collectedArtifacts >= this.totalArtifacts && !this.allArtifactsCollected) {
              this.allArtifactsCollected = true;
              this.ui.showEscapeObjective();
            }
          }
        }

        this.collectPressed = false;

      }
      this.scene.render();
    });

    window.addEventListener("resize", () => {
      this.engine.resize();
    });
  }

  private playBaseAmbience(): void {
    if (!this.baseAmbienceAudio) return;

    void this.baseAmbienceAudio.play();
  }

  private playArtifactEscalation(): void {
    if (!this.artifactEscalationAudio) return;

    this.artifactEscalationAudio.currentTime = 0;
    this.artifactEscalationAudio.loop = true;

    void this.artifactEscalationAudio.play();
  }

  private stopArtifactEscalation(): void {
    this.artifactEscalationAudio?.pause();

    if (this.artifactEscalationAudio) {
      this.artifactEscalationAudio.currentTime = 0;
    }
  }

  private playCreatureChaseMusic(): void {
    // Chase music overrides every previous music state
    this.baseAmbienceAudio?.pause();
    this.artifactEscalationAudio?.pause();

    if (this.baseAmbienceAudio) {
      this.baseAmbienceAudio.currentTime = 0;
    }

    if (this.artifactEscalationAudio) {
      this.artifactEscalationAudio.currentTime = 0;
    }

    if (this.creatureChaseAudio) {
      this.creatureChaseAudio.currentTime = 0;
      this.creatureChaseAudio.loop = true;
      void this.creatureChaseAudio.play();
    }
  }

  private stopAllMusic(): void {
    this.baseAmbienceAudio?.pause();
    this.artifactEscalationAudio?.pause();
    this.creatureChaseAudio?.pause();

    if (this.baseAmbienceAudio) this.baseAmbienceAudio.currentTime = 0;
    if (this.artifactEscalationAudio) this.artifactEscalationAudio.currentTime = 0;
    if (this.creatureChaseAudio) this.creatureChaseAudio.currentTime = 0;
  }

  private setupAudio(scene: Scene): void {
    this.baseAmbienceAudio = new Audio("/assets/audio/base_music.mp3");
    this.baseAmbienceAudio.volume = 0.35;
    this.baseAmbienceAudio.loop = true;

    this.artifactEscalationAudio = new Audio("/assets/audio/escalation_music.mp3");
    this.artifactEscalationAudio.volume = 0.8;
    this.artifactEscalationAudio.loop = false;

    this.creatureChaseAudio = new Audio("/assets/audio/chase_music.mp3");
    this.creatureChaseAudio.volume = 0.8;
    this.creatureChaseAudio.loop = true;

    this.mawRoarAudio = new Audio("/assets/audio/chase_roar.mp3");
    this.mawRoarAudio.volume = 1.0;

    this.mawLowRoarAudio = new Audio("/assets/audio/low_roar.mp3");
    this.mawLowRoarAudio.volume = 1.0;
  }

  private createScene(): Scene {
    const scene = new Scene(this.engine);
    

    scene.clearColor = new Color3(0.01, 0.02, 0.04).toColor4();
    scene.ambientColor = new Color3(0.01, 0.02, 0.025);

    // Underwater fog
    scene.fogMode = Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.045;
    scene.fogColor = new Color3(0.01, 0.03, 0.04);

    // FPS camera
    const camera = new UniversalCamera(
      "PlayerCamera",
      new Vector3(this.startPosition.x, this.startPosition.y, this.startPosition.z),
      scene
    );

    scene.activeCamera = camera;

    camera.attachControl(this.canvas, true);
    camera.inputs.removeByType("FreeCameraKeyboardMoveInput");

    camera.speed = 0.06;
    camera.angularSensibility = 4500;
    camera.inertia = 0.85;

    camera.checkCollisions = true;
    camera.applyGravity = false;
    scene.collisionsEnabled = true;


    this.createFirstPersonArms(scene, camera);


    

    // Basic ambient light
    const ambientLight = new HemisphericLight(
      "ambientLight",
      new Vector3(0, 1, 0),
      scene
    );
    ambientLight.intensity = 0.08;

    // Player lantern
    const lantern = new SpotLight(
      "lantern",
      new Vector3(0, -0.15, 0.2),
      new Vector3(0, 0, 1),
      Math.PI / 3,
      3,
      scene
    );

    lantern.parent = camera;

    lantern.diffuse = new Color3(0.75, 0.9, 1.0);
    lantern.intensity = 18;
    lantern.range = 12;
    lantern.angle = Math.PI / 3;
    lantern.exponent = 3;

    scene.onBeforeRenderObservable.add(() => {
      lantern.direction = camera.getForwardRay().direction;
      lantern.intensity = 17.5 + Math.random() * 1.2;
    });


    const oceanSurface = MeshBuilder.CreateGround(
      "oceanSurface",
      {
        width: 600,
        height: 600,
        subdivisions: 64,
      },
      scene
    );

    oceanSurface.position.y = 150;

    const surfaceMaterial = new StandardMaterial("surfaceMaterial", scene);
    surfaceMaterial.diffuseColor = new Color3(0.05, 0.25, 0.35);
    surfaceMaterial.emissiveColor = new Color3(0.02, 0.12, 0.18);
    surfaceMaterial.alpha = 0.35;
    surfaceMaterial.specularColor = new Color3(0.4, 0.6, 0.7);
    surfaceMaterial.backFaceCulling = false;

    oceanSurface.material = surfaceMaterial;

    scene.onBeforeRenderObservable.add(() => {
      const time = performance.now() * 0.001; 

      oceanSurface.position.y = 150 + Math.sin(time * 0.8) * 0.3;
    });

    this.createMoonAndLight(scene);


    // Ground
    const terrain = MeshBuilder.CreateGround(
      "oceanTerrain",
      {
        width: 500,
        height: 500,
        subdivisions: 150,
        updatable: true,
      },
      scene
    );

    const terrainMaterial = new StandardMaterial("terrainMaterial", scene);
    terrainMaterial.diffuseColor = new Color3(0.07, 0.08, 0.09);
    terrainMaterial.emissiveColor = new Color3(0.01, 0.015, 0.02);
    terrainMaterial.specularColor = new Color3(0, 0, 0);

    const causticsTexture = new Texture(
      "/assets/textures/caustics.png",
      scene
    );

    causticsTexture.uScale = 4;
    causticsTexture.vScale = 4;

    terrainMaterial.emissiveTexture = causticsTexture;
    terrainMaterial.emissiveColor = new Color3(0.08, 0.16, 0.22);

    terrain.material = terrainMaterial;
    scene.onBeforeRenderObservable.add(() => {
      causticsTexture.uOffset += 0.00009;
      causticsTexture.vOffset += 0.00009;
    });

    const positions = terrain.getVerticesData(VertexBuffer.PositionKind);

    if (positions) {
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const z = positions[i + 2];

        const height =
          Math.sin(x * 0.04) * 1.0 +
          Math.cos(z * 0.035) * 1.0 +
          Math.sin((x + z) * 0.025) * 1.0;

        positions[i + 1] = height;
      }

      terrain.updateVerticesData(VertexBuffer.PositionKind, positions);
      terrain.refreshBoundingInfo();
    }

    this.terrain = terrain;


    // Bubbles
    this.createBubbles(scene);


    //Archive
    this.loadArchiveModel(scene);

    
    // Lights for archive front area
    this.createArchiveFrontLights(scene);
    
    
    // Invisible walls
    this.createInvisibleWalls(scene);


    //monster waypoints
    this.setupMonsterWaypoints();
    
    
    //audio
    this.setupAudio(scene);


    return scene;
  }

  private setupInput(): void {
    window.addEventListener("keydown", (event) => {
      this.keys[event.key.toLowerCase()] = true;

      if (event.key === "Escape") {
        event.preventDefault();

        if (this.gameStarted && !this.gameEnded && !this.gamePaused) {
          this.pauseGame();
        }

        return;
      }

      if (event.key.toLowerCase() === "e") {
        this.collectPressed = true;
        this.tryToggleDoor();
      }

      if (event.key.toLowerCase() === "k") {
        this.triggerCreatureDetection();
      }

      if (event.key.toLowerCase() === "p") {
        const camera = this.scene.activeCamera as UniversalCamera;

        console.log(
          `PLAYER POSITION: new Vector3(${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)})`
        );
      }
    });

    window.addEventListener("keyup", (event) => {
      this.keys[event.key.toLowerCase()] = false;
    });

    this.canvas.addEventListener("click", () => {
      if (!this.gameEnded){
        this.canvas.requestPointerLock();
      }
    });

    document.addEventListener("pointerlockchange", () => {
      if (
        this.gameStarted &&
        !this.gameEnded &&
        !this.gamePaused &&
        document.pointerLockElement !== this.canvas
      ) {
        this.pauseGame();
      }
    });
  }


  private getTerrainHeightAt(x: number, z: number): number {
    if (!this.terrain) return -999;

    const positions = this.terrain.getVerticesData(VertexBuffer.PositionKind);
    if (!positions) return -999;

    let closestDistance = Infinity;
    let closestY = 0;

    for (let i = 0; i < positions.length; i += 3) {
      const vx = positions[i] + this.terrain.position.x;
      const vy = positions[i + 1] + this.terrain.position.y;
      const vz = positions[i + 2] + this.terrain.position.z;

      const dx = vx - x;
      const dz = vz - z;
      const dist = dx * dx + dz * dz;

      if (dist < closestDistance) {
        closestDistance = dist;
        closestY = vy;
      }
    }

    return closestY;
  }


  private createMoonAndLight(scene: Scene): void {
    // Visible moon above the water surface
    const moon = MeshBuilder.CreateSphere(
      "moon",
      {
        diameter: 28,
        segments: 48,
      },
      scene
    );

    moon.position = new Vector3(0, 220, 120);

    const moonMaterial = new StandardMaterial("moonMaterial", scene);
    const moonTexture = new Texture(
      "/assets/textures/moon.png",
      scene
    );

    moonTexture.level = 15;

    moonMaterial.diffuseTexture = moonTexture;

    moonMaterial.emissiveTexture = moonTexture;

    moonMaterial.emissiveColor = new Color3(2.8, 2.8, 3.2);

    moonMaterial.disableLighting = true;
    moon.material = moonMaterial;

    const glow = new GlowLayer("glow", scene);
    glow.intensity = 0.3;

    scene.onBeforeRenderObservable.add(() => {
      moon.rotation.y += 0.0001;
    });

  }


  private createArchiveFrontLights(scene: Scene): void {
    // Cold weak floodlight facing the entrance area
    const frontLight = new PointLight(
      "archiveFrontColdLight",
      new Vector3(-6.62, 8.68, 46.30),
      scene
    );

    frontLight.diffuse = new Color3(0.25, 0.45, 0.65);
    frontLight.intensity = 20;
    frontLight.range = 45;

    const frontLight2 = new PointLight(
      "archiveFrontColdLight2",
      new Vector3(9.70, 11.42, 46.99),
      scene
    );

    frontLight2.diffuse = new Color3(0.25, 0.45, 0.65);
    frontLight2.intensity = 20;
    frontLight2.range = 45;

    // Red emergency light above entrance
    const emergencyLight = new PointLight(
      "archiveEntranceEmergencyLight",
      new Vector3(-0.49, 19.08, 48.23),
      scene
    );

    emergencyLight.diffuse = new Color3(1.0, 0.05, 0.03);
    emergencyLight.intensity = 20;
    emergencyLight.range = 18;

    scene.onBeforeRenderObservable.add(() => {
      const flicker = Math.random();

      if (flicker < 0.05) {
        emergencyLight.intensity = 0.3;
      } else {
        emergencyLight.intensity = 10 + Math.random() * 0.7;
      }
    });
  }


  private createBubbles(scene: Scene): void {
    const bubbles = new ParticleSystem("bubbles", 5000, scene);

    bubbles.particleTexture = new Texture(
      "/assets/textures/bubbles.png",
      scene
    );

    // Bubbles spawn around the playable area
    bubbles.emitter = new Vector3(0, 2, 0);

    bubbles.minEmitBox = new Vector3(-80, -10, -80);
    bubbles.maxEmitBox = new Vector3(80, 20, 80);

    // Bubble appearance
    bubbles.minSize = 0.15;
    bubbles.maxSize = 0.25;

    bubbles.color1 = new Color3(0.8, 0.95, 1.0).toColor4(0.65);
    bubbles.color2 = new Color3(0.6, 0.85, 1.0).toColor4(0.4);

    // Bubble lifetime
    bubbles.minLifeTime = 25;
    bubbles.maxLifeTime = 50;

    // Amount of bubbles
    bubbles.emitRate = 20;

    // Movement upward with small randomness
    bubbles.direction1 = new Vector3(-0.1, 0.4, -0.1);
    bubbles.direction2 = new Vector3(0.1, 1.0, 0.1);

    bubbles.minEmitPower = 0.1;
    bubbles.maxEmitPower = 0.4;

    bubbles.updateSpeed = 0.1;

    bubbles.blendMode = ParticleSystem.BLENDMODE_STANDARD;

    bubbles.start();
  }

  private async loadArchiveModel(scene: Scene): Promise<void> {
    try {
      const result = await ImportMeshAsync(
        "/assets/models/archive.glb",
        scene
      );

      result.animationGroups.forEach((animationGroup) => {
        animationGroup.stop();
        animationGroup.reset();
      });

      this.setupDoors(
        result.meshes.filter((mesh) => mesh instanceof AbstractMesh) as AbstractMesh[],
        result.animationGroups);


      console.log("Archive loaded:", result);
      console.log("Meshes:", result.meshes.map((m) => m.name));
      console.log("Animations:", result.animationGroups.map((a) => a.name));

      const importedRoot =
        result.meshes.find((mesh) => mesh.name === "__root__") ??
        result.meshes[0];

      importedRoot.position = new Vector3(0, 0, 80);

      importedRoot.scaling = new Vector3(-1, 1, 1);

      importedRoot.rotation = new Vector3(0, Math.PI, 0);


      result.meshes.forEach((mesh) => {

        if (mesh.name.toLowerCase().includes("door")) {

          console.log(
            "DOOR FOUND:",
            mesh.name,
            mesh.position
          );
        }
      });

      this.collisionMeshes = result.meshes.filter((mesh) => {
        if (!(mesh instanceof AbstractMesh)) return false;

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
      }) as AbstractMesh[];


      console.log(
        "POSSIBLE ARTIFACT MESHES:",
        result.meshes
          .map((m) => m.name)
          .filter((name) => name.toLowerCase().includes("artifact"))
      );

      this.artifacts = [];
      const artifactNames = [
        "artifact 1",
        "artifact 2",
        "artifact 3",
        "artifact 4",
        "artifact 5",
      ];

      artifactNames.forEach((artifactName) => {
        const meshes = result.meshes.filter((mesh) => {
          if (!(mesh instanceof AbstractMesh)) return false;

          return mesh.name.startsWith(artifactName);
        }) as AbstractMesh[];

        if (meshes.length > 0) {
          this.artifacts.push({
            id: artifactName,
            meshes,
            collected: false,
          });
        }
      });

      this.totalArtifacts = this.artifacts.length;
      this.ui?.updateArtifacts(this.collectedArtifacts, this.totalArtifacts);

      console.log(
        "ARTIFACT GROUPS FOUND:",
        this.artifacts.map((a) => ({
          id: a.id,
          meshes: a.meshes.map((m) => m.name),
        }))
      );


      this.monster = result.meshes.find((mesh) =>
        mesh.name.toLowerCase().includes("drowned maw")
      ) as AbstractMesh | undefined;

      if (this.monster) {
        console.log("MONSTER FOUND:", this.monster.name);

        const worldPosition = this.monster.getAbsolutePosition().clone();
        
        this.monster.setParent(null);
        this.monster.position.copyFrom(worldPosition);

        const monsterFloorY = this.getTerrainHeightAt(this.monster.position.x, this.monster.position.z) + this.monsterFloorOffset;
        this.monster.position.y = Math.max(this.monster.position.y, monsterFloorY);

        this.monsterStartPosition = this.monster.position.clone();
        this.monsterStartRotation = this.monster.rotation.clone();

        this.monster.setEnabled(false); // hidden until chase starts
      }


    } catch (error) {
      console.error("Failed to load archive model:", error);
    }
  }


  private triggerCreatureDetection(): void {
    if (this.creatureDetected) return;

    this.creatureDetected = true;

    this.stopArtifactEscalation();
    this.playCreatureChaseMusic();
  }


  private getDoorNumber(name: string): number {
    const match = name.match(/\.(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  }

  private setupDoors(meshes: AbstractMesh[], animationGroups: AnimationGroup[]): void {
    const doorMeshes = meshes
      .filter((mesh) => /^Door(\.\d+)?$/i.test(mesh.name))
      .sort((a, b) => this.getDoorNumber(a.name) - this.getDoorNumber(b.name));

    const doorActions = animationGroups
      .filter((group) => group.name.startsWith("DoorAction"))
      .sort((a, b) => this.getDoorNumber(a.name) - this.getDoorNumber(b.name));

    this.doors = doorMeshes.map((doorMesh, index) => {
      const doorAction = doorActions[index];

      if (!doorAction) {
        return {
          meshName: doorMesh.name,
          animationGroups: [],
          isOpen: false,
          isAnimating: false,
        };
      }

      const suffix = doorAction.name.match(/\.\d+$/)?.[0] ?? "";

      const relatedAnimations = animationGroups.filter((group) =>
        group.name.endsWith(suffix)
      );

      relatedAnimations.forEach((group) => {
        group.stop();
        group.reset();
      });

      console.log(
        "REGISTERED DOOR:",
        doorMesh.name,
        relatedAnimations.map((a) => a.name)
      );

      return {
        meshName: doorMesh.name,
        animationGroups: relatedAnimations,
        isOpen: false,
        isAnimating: false,
      };
    });
  }


  private tryToggleDoor(): void {
    const camera = this.scene.activeCamera as UniversalCamera;
    const ray = camera.getForwardRay(this.doorInteractionDistance);

    const hit = this.scene.pickWithRay(ray, (mesh) =>
      /^Door(\.\d+)?$/i.test(mesh.name)
    );

    if (!hit?.hit || !hit.pickedMesh) return;

    const door = this.doors.find((d) => d.meshName === hit.pickedMesh!.name);

    if (!door) {
      console.warn("Door not registered:", hit.pickedMesh.name);
      return;
    }

    if (door.isAnimating || door.animationGroups.length === 0) return;

    door.isAnimating = true;

    const mainDoorAnimation = door.animationGroups.find((ag) =>
      ag.name.startsWith("DoorAction")
    );

    if (!mainDoorAnimation) return;

    const from = door.isOpen ? mainDoorAnimation.to : mainDoorAnimation.from;
    const to = door.isOpen ? mainDoorAnimation.from : mainDoorAnimation.to;

    door.animationGroups.forEach((group) => {
      group.stop();
      group.start(false, 1.0, from, to, false);
    });

    door.isOpen = !door.isOpen;
    // Trigger after opening second floor double door
    if (
      !this.secondFloorTriggered &&
      (door.meshName === "Door.006" || door.meshName === "Door.007")
    ) {
      this.secondFloorTriggered = true;

      console.log("Second floor double door opened. Monster chase in 5 seconds.");

      setTimeout(() => {
        this.startMonsterChase();
      }, 5000);
    }

    setTimeout(() => {
      door.isAnimating = false;
    }, 1600);
  }


  private isBlockedByWall(currentPosition: Vector3, moveDirection: Vector3): boolean {
    if (moveDirection.length() === 0) return false;

    const direction = moveDirection.normalize();

    const rayOrigin = currentPosition.clone();
    rayOrigin.y -= 0.4;

    const ray = new Ray(
      rayOrigin,
      direction,
      this.wallCollisionDistance
    );

    const hit = this.scene.pickWithRay(ray, (mesh) => {

      return this.collisionMeshes.includes(mesh as AbstractMesh);
    });

    return !!hit?.hit;
  }


  private updateTargetedImportedArtifact(): string | undefined {
    const camera = this.scene.activeCamera as UniversalCamera;
    const ray = camera.getForwardRay(this.artifactInteractionDistance);

    const hit = this.scene.pickWithRay(ray, (mesh) => {
      return this.artifacts.some((artifact) =>
        !artifact.collected && artifact.meshes.includes(mesh as AbstractMesh)
      );
    });

    if (hit?.hit && hit.pickedMesh) {
      const artifact = this.artifacts.find((a) =>
        a.meshes.includes(hit.pickedMesh as AbstractMesh)
      );

      this.targetedArtifactId = artifact?.id;
      return this.targetedArtifactId;
    }

    this.targetedArtifactId = undefined;
    return undefined;
  }

  private collectImportedArtifact(): boolean {
    if (!this.targetedArtifactId) return false;

    const artifact = this.artifacts.find(
      (a) => a.id === this.targetedArtifactId
    );

    if (!artifact || artifact.collected) return false;

    artifact.collected = true;

    artifact.meshes.forEach((mesh) => {
      mesh.setEnabled(false);
    });

    this.targetedArtifactId = undefined;

    return true;
  }


  private setupMonsterWaypoints(): void {
    this.monsterWaypoints = [
      new Vector3(28.42, 0, 56.35),   // 0 = waypoint 1
      new Vector3(5.59, 0, 56.42),    // 1 = waypoint 2
      new Vector3(-16.84, 0, 56.24),  // 2 = waypoint 3
      new Vector3(28.70, 0, 67.63),   // 3 = waypoint 4
      new Vector3(7.64, 0, 67.38),    // 4 = waypoint 5
      new Vector3(-7.57, 0, 67.68),   // 5 = waypoint 6
      new Vector3(-17.77, 0, 67.29),  // 6 = waypoint 7
      new Vector3(-27.53, 0, 67.53),  // 7 = waypoint 8
      new Vector3(28.70, 0, 77.91),   // 8 = waypoint 9
      new Vector3(18.13, 0, 77.91),   // 9 = waypoint 10
      new Vector3(9.94, 0, 77.26),    // 10 = waypoint 11
      new Vector3(7.63, 0, 76.89),    // 11 = waypoint 12
      new Vector3(-0.55, 0, 77.39),   // 12 = waypoint 13
      new Vector3(-7.56, 0, 77.28),   // 13 = waypoint 14
      new Vector3(-28.24, 0, 77.93),  // 14 = waypoint 15
      new Vector3(17.87, 0, 89.57),   // 15 = waypoint 16
      new Vector3(27.52, 0, 90.97),   // 16 = waypoint 17
      new Vector3(27.27, 0, 103.62),  // 17 = waypoint 18
      new Vector3(18.93, 0, 103.09),  // 18 = waypoint 19
      new Vector3(-0.86, 0, 89.74),   // 19 = waypoint 20
      new Vector3(-11.06, 0, 90.04),  // 20 = waypoint 21
      new Vector3(-11.05, 0, 102.13), // 21 = waypoint 22
      new Vector3(-26.04, 0, 102.25), // 22 = waypoint 23
      new Vector3(-26.40, 0, 90.33),  // 23 = waypoint 24
    ];

    this.monsterWaypointLinks = [
      [1, 3],          // waypoint 1
      [0, 2, 4],       // waypoint 2
      [1, 6],          // waypoint 3
      [0, 4, 8],       // waypoint 4
      [1, 3, 5, 11],   // waypoint 5
      [4, 6, 13],      // waypoint 6
      [2, 5, 7],       // waypoint 7
      [6, 14],         // waypoint 8
      [3, 9],          // waypoint 9
      [8, 10, 15],     // waypoint 10
      [9, 11],         // waypoint 11
      [4, 10, 12],     // waypoint 12
      [11, 13, 19],    // waypoint 13
      [5, 12, 14],     // waypoint 14
      [7, 13],         // waypoint 15
      [9, 16],         // waypoint 16
      [15, 17],        // waypoint 17
      [16, 18],        // waypoint 18
      [15, 17],        // waypoint 19
      [12, 20],        // waypoint 20
      [19, 21, 23],    // waypoint 21
      [20, 22],        // waypoint 22
      [21, 23],        // waypoint 23
      [20, 22],        // waypoint 24
    ];
  }

  private playMawRoar(): void {
    if (!this.mawRoarAudio) return;

    this.mawRoarAudio.currentTime = 0;
    void this.mawRoarAudio.play();
  }

  private playMawLowRoar(): void {
    if (!this.mawLowRoarAudio || this.mawLowRoarPlayed) return;

    this.mawLowRoarPlayed = true;
    this.mawLowRoarAudio.currentTime = 0;
    void this.mawLowRoarAudio.play();
  }
  
  private startMonsterChase(): void {
    if (!this.monster || this.monsterChaseStarted) return;

    this.monsterChaseStarted = true;
    this.monster.setEnabled(true);

    this.creatureDetected = true;
    this.playCreatureChaseMusic();

    this.monsterPath = [];

    this.playMawRoar();

    if (this.mawRoarInterval) {
      clearInterval(this.mawRoarInterval);
    }

    this.mawRoarInterval = window.setInterval(() => {
      this.playMawRoar();
    }, 12000);


    console.log("THE DROWNED MAW HAS STARTED CHASING YOU");
  }


  private getNearestWaypointIndex(position: Vector3): number {
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    this.monsterWaypoints.forEach((waypoint, index) => {
      const distance = Vector3.Distance(
        new Vector3(position.x, 0, position.z),
        new Vector3(waypoint.x, 0, waypoint.z)
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    return nearestIndex;
  }

  private findWaypointPath(startIndex: number, goalIndex: number): number[] {
    const queue: number[][] = [[startIndex]];
    const visited = new Set<number>();

    while (queue.length > 0) {
      const path = queue.shift()!;
      const current = path[path.length - 1];

      if (current === goalIndex) {
        return path;
      }

      if (visited.has(current)) continue;
      visited.add(current);

      this.monsterWaypointLinks[current].forEach((next) => {
        if (!visited.has(next)) {
          queue.push([...path, next]);
        }
      });
    }

    return [startIndex];
  }


  private isMonsterObstacle(mesh: AbstractMesh): boolean {
    if (mesh === this.monster) return false;

    const name = mesh.name.toLowerCase();

    // Ignore only book meshes, not all "object" furniture
    if (name.includes("object001_books")) return false;
    if (name.includes("_books")) return false;
    if (name.includes("books_")) return false;

    // Ignore artifacts
    if (name.includes("artifact")) return false;

    return this.collisionMeshes.includes(mesh);
  }

  private updateMonsterChase(): void {
    if (!this.monster || !this.monsterChaseStarted) return;

    const camera = this.scene.activeCamera as UniversalCamera;
    const deltaTime = this.engine.getDeltaTime() / 1000;

    const monsterPos = this.monster.position.clone();
    const playerDistance = Vector3.Distance(monsterPos, camera.position);

    if (playerDistance < this.monsterCatchDistance) {
      this.mawCaughtPlayer();
      return;
    }

    // If player is close and there is a clear path, chase directly
    const directChaseDistance = 7;
    const directDirection = camera.position.subtract(monsterPos);

    if (playerDistance < directChaseDistance && directDirection.length() > 0.2) {
      const directRay = new Ray(
        monsterPos.add(new Vector3(0, 1, 0)),
        directDirection.normalize(),
        playerDistance
      );

      const directBlocked = this.scene.pickWithRay(directRay, (mesh) => {
        return this.isMonsterObstacle(mesh as AbstractMesh);
      });

      if (!directBlocked?.hit) {
        const nextPosition = monsterPos.add(
          directDirection.normalize().scale(this.monsterSpeed * deltaTime)
        );

        const floorY =
          this.getTerrainHeightAt(nextPosition.x, nextPosition.z) +
          this.monsterFloorOffset;

        const ceilingY = this.worldMaxY - 2.5;
        nextPosition.y = Math.max(floorY, Math.min(ceilingY, nextPosition.y));

        this.monster.position.copyFrom(nextPosition);
        this.monster.lookAt(camera.position.clone());
        return;
      }
    }

    this.monsterPathUpdateTimer -= deltaTime;

    if (this.monsterPath.length === 0 || this.monsterPathUpdateTimer <= 0) {
      const monsterWaypoint = this.getNearestWaypointIndex(monsterPos);
      const playerWaypoint = this.getNearestWaypointIndex(camera.position);

      this.monsterPath = this.findWaypointPath(monsterWaypoint, playerWaypoint);
      this.monsterPathUpdateTimer = 2.0;
    }

    if (this.monsterPath.length < 2) {
      this.monster.lookAt(camera.position.clone());
      return;
    }

    const nextWaypointIndex = this.monsterPath[1];
    const waypoint = this.monsterWaypoints[nextWaypointIndex];

    const targetPos = new Vector3(
      waypoint.x,
      this.monster.position.y,
      waypoint.z
    );

    const flatDistanceToWaypoint = Vector3.Distance(
      new Vector3(monsterPos.x, 0, monsterPos.z),
      new Vector3(targetPos.x, 0, targetPos.z)
    );

    if (flatDistanceToWaypoint < 0.1) {
      this.monsterPath.shift();
      return;
    }

    const toTarget = targetPos.subtract(monsterPos);
    if (toTarget.length() === 0) return;

    const moveDirection = toTarget.normalize();

    const wallCheckRay = new Ray(
      monsterPos.add(new Vector3(0, 1, 0)),
      moveDirection,
      2.5
    );

    const blocked = this.scene.pickWithRay(wallCheckRay, (mesh) => {
      return this.isMonsterObstacle(mesh as AbstractMesh);
    });

    if (blocked?.hit) {
      this.monsterPathUpdateTimer = 0;
      return;
    }

    const nextPosition = monsterPos.add(
      moveDirection.scale(this.monsterSpeed * deltaTime)
    );

    // Vertical follow separately
    const verticalDifference = camera.position.y - nextPosition.y;
    const maxVerticalMove = 1.5 * deltaTime;

    if (Math.abs(verticalDifference) > 0.2) {
      nextPosition.y += Math.sign(verticalDifference) * maxVerticalMove;
    }

    const floorY =
      this.getTerrainHeightAt(nextPosition.x, nextPosition.z) +
      this.monsterFloorOffset;

    const ceilingY = this.worldMaxY - 2.5;
    nextPosition.y = Math.max(floorY, Math.min(ceilingY, nextPosition.y));

    this.monster.position.copyFrom(nextPosition);
    this.monster.lookAt(targetPos);
  }


  private mawCaughtPlayer(): void {
    if (this.gameEnded) return;

    this.gameEnded = true;
    this.monsterChaseStarted = false;

    this.ui.setChaseEffect(false);

    if (this.mawRoarInterval) {
      clearInterval(this.mawRoarInterval);
      this.mawRoarInterval = undefined;
    }

    this.playMawRoar();

    setTimeout(() => {
      this.mawRoarAudio?.pause();

      if (this.mawRoarAudio) {
        this.mawRoarAudio.currentTime = 0;
      }
    }, 4000);

    this.ui.showGameOver();

    const endScreen = document.querySelector(".end-screen h1");
    if (endScreen) {
      endScreen.textContent = "The Drowned Maw caught you";
    }

    if (document.pointerLockElement === this.canvas) {
      document.exitPointerLock();
    }
  }

  private updatePlayerMovement(): void {
    const camera = this.scene.activeCamera as UniversalCamera;

    const deltaTime = this.engine.getDeltaTime() / 1000; // Convert to seconds

    const normalSpeed = 4.0;
    const fastSpeed = 7.0;

    const isForwardPressed = this.keys["w"] || this.keys["z"];
    const isShiftPressed = this.keys["shift"];

    const speed = isShiftPressed && isForwardPressed ? fastSpeed : normalSpeed;

    let moveDirection = Vector3.Zero();

    const forward = camera.getDirection(Vector3.Forward());
    const right = camera.getDirection(Vector3.Right());
    const up = Vector3.Up();

    if (this.keys["w"] || this.keys["z"]) {
      moveDirection = moveDirection.add(forward);
    }

    if (this.keys["s"]) {
      moveDirection = moveDirection.subtract(forward);
    }
    
    if (this.keys["a"] || this.keys["q"]) {
      moveDirection = moveDirection.subtract(right);
    }

    if (this.keys["d"]) {
      moveDirection = moveDirection.add(right);
    }

    if (this.keys[" "]) {
      moveDirection = moveDirection.add(up);
    }

    if (this.keys["control"]) {
      moveDirection = moveDirection.subtract(up);
    }

    if (moveDirection.length() > 0) {
      moveDirection = moveDirection.normalize();
      const nextPosition = camera.position.add(moveDirection.scale(speed * deltaTime));

      const terrainHeight = this.getTerrainHeightAt(nextPosition.x, nextPosition.z);
      const minimumY = terrainHeight + this.minHeightAboveTerrain;

      if (nextPosition.y < minimumY) {
        nextPosition.y = minimumY;
      }

      // Invisible boundary limits
      nextPosition.x = Math.max(this.worldMinX, Math.min(this.worldMaxX, nextPosition.x));
      nextPosition.y = Math.max(this.worldMinY, Math.min(this.worldMaxY, nextPosition.y));
      nextPosition.z = Math.max(this.worldMinZ, Math.min(this.worldMaxZ, nextPosition.z));
            
      if (!this.isBlockedByWall(camera.position, moveDirection)) {
        camera.position.copyFrom(nextPosition);
      }
    }
  }


  private createFirstPersonArms(scene: Scene, camera: UniversalCamera): void {
    const armMaterial = new StandardMaterial("armMaterial", scene);
    armMaterial.diffuseColor = new Color3(0.02, 0.02, 0.025);
    armMaterial.specularColor = new Color3(0.1, 0.1, 0.1);

    const leftArm = MeshBuilder.CreateBox("leftArm", {
      width: 0.18,
      height: 0.18,
      depth: 1.2,
    }, scene);

    leftArm.parent = camera;
    leftArm.position = new Vector3(-0.35, -0.45, 1.0);
    leftArm.rotation = new Vector3(0.25, 0.25, 0);

    const rightArm = leftArm.clone("rightArm");
    rightArm.parent = camera;
    rightArm.position = new Vector3(0.35, -0.45, 1.0);
    rightArm.rotation = new Vector3(0.25, -0.25, 0);

    leftArm.material = armMaterial;
    rightArm.material = armMaterial;

    scene.onBeforeRenderObservable.add(() => {
      if (this.gameEnded) return;

      const t = performance.now() * 0.006;

      const moving =
        this.keys["w"] ||
        this.keys["z"] ||
        this.keys["s"] ||
        this.keys["a"] ||
        this.keys["q"] ||
        this.keys["d"] ||
        this.keys[" "] ||
        this.keys["control"];

      const swimAmount = moving ? 0.18 : 0.04;

      leftArm.position.z = 1.0 + Math.sin(t) * swimAmount;
      rightArm.position.z = 1.0 + Math.sin(t + Math.PI) * swimAmount;

      leftArm.rotation.x = 0.25 + Math.sin(t) * 0.25;
      rightArm.rotation.x = 0.25 + Math.sin(t + Math.PI) * 0.25;
    });
  }

  private updateOxygen(): void {
    const deltaTime = this.engine.getDeltaTime() / 1000;

    this.oxygen -= 1 * (deltaTime/3);

    if (this.oxygen <= 0) {
      this.oxygen = 0;
      this.endGame();
    }

    this.ui.updateOxygen(this.oxygen, this.maxOxygen);
  }

  private checkEscapeWinCondition(): void {
    if (!this.allArtifactsCollected) return;

    const camera = this.scene.activeCamera as UniversalCamera;

    const distanceToExit = Vector3.Distance(
      camera.position,
      this.escapePosition
    );

    if (distanceToExit < this.escapeDistance) {
      this.winGame();
    }
  }


  private pauseGame(): void {
    if (this.gamePaused || this.gameEnded || !this.gameStarted) return;

    this.gamePaused = true;

    this.ui.showPauseMenu(
      () => {
        this.resumeGame();
      },
      () => {
        this.ui.showControlsPanel();
      },
      () => {
        window.location.reload();
      }
    );

    if (document.pointerLockElement === this.canvas) {
      document.exitPointerLock();
    }
  }

  private resumeGame(): void {
    if (!this.gamePaused || this.gameEnded) return;

    this.gamePaused = false;
    this.ui.hidePauseMenu();

    this.canvas.requestPointerLock();
  }

  private restartGame(): void {
    const camera = this.scene.activeCamera as UniversalCamera;

    this.oxygen = this.maxOxygen;
    this.gameEnded = false;
    this.collectPressed = false;
    this.collectedArtifacts = 0;
    this.monsterChaseStarted = false;
    this.creatureDetected = false;
    this.secondFloorTriggered = false;
    this.allArtifactsCollected = false;
    this.gameStarted = true;
    this.gamePaused = false;
    this.mawLowRoarPlayed = false;
    this.stopAllMusic();
    this.playBaseAmbience();
    this.ui.hidePauseMenu();
    this.ui.hideMainMenu();
    this.ui.updateObjective("Collect all artifacts");

    if (this.monster && this.monsterStartPosition) {
      this.monster.position.copyFrom(this.monsterStartPosition);

      if (this.monsterStartRotation) {
        this.monster.rotation.copyFrom(this.monsterStartRotation);
      }

      this.monster.setEnabled(false);
    }

    if (this.mawRoarInterval) {
      clearInterval(this.mawRoarInterval);
      this.mawRoarInterval = undefined;
    }

    this.mawRoarAudio?.pause();
    if (this.mawRoarAudio) {
      this.mawRoarAudio.currentTime = 0;
    }

    this.mawLowRoarAudio?.pause();

    if (this.mawLowRoarAudio) {
      this.mawLowRoarAudio.currentTime = 0;
    }

    this.doors.forEach((door) => {
      door.isOpen = false;
      door.isAnimating = false;

      door.animationGroups.forEach((group) => {
        group.stop();
        group.reset();
      });
    });

    this.artifacts.forEach((artifact) => {
      artifact.collected = false;

      artifact.meshes.forEach((mesh) => {
        mesh.setEnabled(true);
      });
    });

    this.targetedArtifactId = undefined;

    camera.position = this.startPosition.clone();

    this.ui.updateOxygen(this.oxygen, this.maxOxygen);
    this.ui.updateArtifacts(this.collectedArtifacts, this.totalArtifacts);
    this.ui.hideEndScreen();
    this.ui.hideInteractionPrompt();
    this.ui.setChaseEffect(false);

    this.canvas.requestPointerLock();
  }


  private endGame(): void {
    if (this.gameEnded) return;

    if (this.mawRoarInterval) {
      clearInterval(this.mawRoarInterval);
      this.mawRoarInterval = undefined;
    }

    this.mawRoarAudio?.pause();

    if (this.mawRoarAudio) {
      this.mawRoarAudio.currentTime = 0;
    }

    this.mawLowRoarAudio?.pause();

    if (this.mawLowRoarAudio) {
      this.mawLowRoarAudio.currentTime = 0;
    }

    this.gameEnded = true;
    this.monsterChaseStarted = false;
    this.stopAllMusic();
    this.ui.setChaseEffect(false);
    this.ui.showGameOver();

    if (document.pointerLockElement === this.canvas) {
      document.exitPointerLock();
    }
  }


  private winGame(): void {
    if (this.gameEnded) return;

    if (this.mawRoarInterval) {
      clearInterval(this.mawRoarInterval);
      this.mawRoarInterval = undefined;
    }

    this.mawRoarAudio?.pause();

    if (this.mawRoarAudio) {
      this.mawRoarAudio.currentTime = 0;
    }

    this.mawLowRoarAudio?.pause();

    if (this.mawLowRoarAudio) {
      this.mawLowRoarAudio.currentTime = 0;
    }

    this.gameEnded = true;
    this.monsterChaseStarted = false;
    this.stopAllMusic();
    this.ui.setChaseEffect(false);
    this.ui.showWin();

    if (document.pointerLockElement === this.canvas) {
      document.exitPointerLock();
    }
  }


  //invisible walls to prevent going too far
  private createInvisibleWalls(scene: Scene): void {
    const wallData = [
      // FRONT
      {
        position: new Vector3(0, 20, 260),
        scaling: new Vector3(500, 80, 5),
      },

      // BACK
      {
        position: new Vector3(0, 20, -260),
        scaling: new Vector3(500, 80, 5),
      },

      // LEFT
      {
        position: new Vector3(-260, 20, 0),
        scaling: new Vector3(5, 80, 500),
      },

      // RIGHT
      {
        position: new Vector3(260, 20, 0),
        scaling: new Vector3(5, 80, 500),
      },

    ];

    wallData.forEach((data, index) => {

      const wall = MeshBuilder.CreateBox(
        `invisibleWall_${index}`,
        {
          width: 1,
          height: 1,
          depth: 1,
        },
        scene
      );

      wall.position = data.position;

      wall.scaling = data.scaling;

      wall.isVisible = false;

      wall.checkCollisions = true;

    });
  }
}