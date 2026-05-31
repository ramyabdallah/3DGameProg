import {
  Scene,
  Vector3,
  Color3,
  UniversalCamera,
  HemisphericLight,
  PointLight,
  SpotLight,
  MeshBuilder,
  StandardMaterial,
  VertexBuffer,
  Texture,
  GlowLayer,
  ParticleSystem,
} from "@babylonjs/core";

export default class WorldBuilder {
  public terrain!: ReturnType<typeof MeshBuilder.CreateGround>;

  private scene: Scene;
  constructor(scene: Scene) {
    this.scene = scene;
  }

  create(startPosition: Vector3, canvas: HTMLCanvasElement): UniversalCamera {
    this.scene.clearColor = new Color3(0.01, 0.02, 0.04).toColor4();
    this.scene.ambientColor = new Color3(0.01, 0.02, 0.025);
    this.scene.fogMode = Scene.FOGMODE_EXP2;
    this.scene.fogDensity = 0.012;
    this.scene.fogColor = new Color3(0.01, 0.03, 0.04);

    const camera = this.createCamera(startPosition, canvas);
    this.createAmbientLight();
    this.createPlayerLantern(camera);
    this.createOceanSurface();
    this.createMoonAndLight();
    this.createTerrain();
    this.createBubbles();
    this.createArchiveFrontLights();
    this.createInvisibleWalls();

    return camera;
  }

  private createCamera(startPosition: Vector3, canvas: HTMLCanvasElement): UniversalCamera {
    const camera = new UniversalCamera("PlayerCamera", startPosition.clone(), this.scene);
    this.scene.activeCamera = camera;

    camera.attachControl(canvas, true);
    camera.inputs.removeByType("FreeCameraKeyboardMoveInput");
    camera.speed = 0.06;
    camera.angularSensibility = 4500;
    camera.inertia = 0.85;
    camera.checkCollisions = true;
    camera.applyGravity = false;
    this.scene.collisionsEnabled = true;

    return camera;
  }

  private createAmbientLight(): void {
    const ambientLight = new HemisphericLight("ambientLight", new Vector3(0, 1, 0), this.scene);
    ambientLight.intensity = 0.08;
  }

  private createPlayerLantern(camera: UniversalCamera): void {
    const lantern = new SpotLight(
      "lantern",
      new Vector3(0, -0.15, 0.2),
      new Vector3(0, 0, 1),
      Math.PI / 3,
      3,
      this.scene
    );

    lantern.parent = camera;
    lantern.diffuse = new Color3(0.75, 0.9, 1.0);
    lantern.intensity = 18;
    lantern.range = 12;
    lantern.angle = Math.PI / 3;
    lantern.exponent = 3;

    this.scene.onBeforeRenderObservable.add(() => {
      lantern.direction = camera.getForwardRay().direction;
      lantern.intensity = 17.5 + Math.random() * 1.2;
    });
  }

  private createOceanSurface(): void {
    const oceanSurface = MeshBuilder.CreateGround(
      "oceanSurface",
      { width: 600, height: 600, subdivisions: 64 },
      this.scene
    );

    oceanSurface.position.y = 150;

    const surfaceMaterial = new StandardMaterial("surfaceMaterial", this.scene);
    surfaceMaterial.diffuseColor = new Color3(0.05, 0.25, 0.35);
    surfaceMaterial.emissiveColor = new Color3(0.02, 0.12, 0.18);
    surfaceMaterial.alpha = 0.35;
    surfaceMaterial.specularColor = new Color3(0.4, 0.6, 0.7);
    surfaceMaterial.backFaceCulling = false;
    oceanSurface.material = surfaceMaterial;

    this.scene.onBeforeRenderObservable.add(() => {
      const time = performance.now() * 0.001;
      oceanSurface.position.y = 150 + Math.sin(time * 0.8) * 0.3;
    });
  }

  private createMoonAndLight(): void {
    const moon = MeshBuilder.CreateSphere("moon", { diameter: 28, segments: 48 }, this.scene);
    moon.position = new Vector3(0, 220, 120);

    const moonMaterial = new StandardMaterial("moonMaterial", this.scene);
    const moonTexture = new Texture(`${import.meta.env.BASE_URL}assets/textures/moon.png`, this.scene);
    moonTexture.level = 15;

    moonMaterial.diffuseTexture = moonTexture;
    moonMaterial.emissiveTexture = moonTexture;
    moonMaterial.emissiveColor = new Color3(2.8, 2.8, 3.2);
    moonMaterial.disableLighting = true;
    moon.material = moonMaterial;

    const glow = new GlowLayer("glow", this.scene);
    glow.intensity = 0.3;

    this.scene.onBeforeRenderObservable.add(() => {
      moon.rotation.y += 0.0001;
    });
  }

  private createTerrain(): void {
    const terrain = MeshBuilder.CreateGround(
      "oceanTerrain",
      { width: 500, height: 500, subdivisions: 150, updatable: true },
      this.scene
    );

    const terrainMaterial = new StandardMaterial("terrainMaterial", this.scene);
    terrainMaterial.diffuseColor = new Color3(0.07, 0.08, 0.09);
    terrainMaterial.emissiveColor = new Color3(0.01, 0.015, 0.02);
    terrainMaterial.specularColor = new Color3(0, 0, 0);

    const causticsTexture = new Texture(`${import.meta.env.BASE_URL}assets/textures/caustics.png`, this.scene);
    causticsTexture.uScale = 4;
    causticsTexture.vScale = 4;

    terrainMaterial.emissiveTexture = causticsTexture;
    terrainMaterial.emissiveColor = new Color3(0.08, 0.16, 0.22);
    terrain.material = terrainMaterial;

    this.scene.onBeforeRenderObservable.add(() => {
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
  }

  private createArchiveFrontLights(): void {
    const frontLight = new PointLight("archiveFrontColdLight", new Vector3(-6.62, 8.68, 46.30), this.scene);
    frontLight.diffuse = new Color3(0.25, 0.45, 0.65);
    frontLight.intensity = 20;
    frontLight.range = 45;

    const frontLight2 = new PointLight("archiveFrontColdLight2", new Vector3(9.70, 11.42, 46.99), this.scene);
    frontLight2.diffuse = new Color3(0.25, 0.45, 0.65);
    frontLight2.intensity = 20;
    frontLight2.range = 45;

    const emergencyLight = new PointLight("archiveEntranceEmergencyLight", new Vector3(-0.49, 19.08, 48.23), this.scene);
    emergencyLight.diffuse = new Color3(1.0, 0.05, 0.03);
    emergencyLight.intensity = 20;
    emergencyLight.range = 18;

    this.scene.onBeforeRenderObservable.add(() => {
      const flicker = Math.random();
      emergencyLight.intensity = flicker < 0.05 ? 0.3 : 10 + Math.random() * 0.7;
    });
  }

  private createBubbles(): void {
    const bubbles = new ParticleSystem("bubbles", 5000, this.scene);
    bubbles.particleTexture = new Texture(`${import.meta.env.BASE_URL}assets/textures/bubbles.png`, this.scene);
    bubbles.emitter = new Vector3(0, 2, 0);
    bubbles.minEmitBox = new Vector3(-80, -10, -80);
    bubbles.maxEmitBox = new Vector3(80, 20, 80);
    bubbles.minSize = 0.15;
    bubbles.maxSize = 0.25;
    bubbles.color1 = new Color3(0.8, 0.95, 1.0).toColor4(0.65);
    bubbles.color2 = new Color3(0.6, 0.85, 1.0).toColor4(0.4);
    bubbles.minLifeTime = 25;
    bubbles.maxLifeTime = 50;
    bubbles.emitRate = 20;
    bubbles.direction1 = new Vector3(-0.1, 0.4, -0.1);
    bubbles.direction2 = new Vector3(0.1, 1.0, 0.1);
    bubbles.minEmitPower = 0.1;
    bubbles.maxEmitPower = 0.4;
    bubbles.updateSpeed = 0.1;
    bubbles.blendMode = ParticleSystem.BLENDMODE_STANDARD;
    bubbles.start();
  }

  private createInvisibleWalls(): void {
    const wallData = [
      { position: new Vector3(0, 20, 260), scaling: new Vector3(500, 80, 5) },
      { position: new Vector3(0, 20, -260), scaling: new Vector3(500, 80, 5) },
      { position: new Vector3(-260, 20, 0), scaling: new Vector3(5, 80, 500) },
      { position: new Vector3(260, 20, 0), scaling: new Vector3(5, 80, 500) },
    ];

    wallData.forEach((data, index) => {
      const wall = MeshBuilder.CreateBox(`invisibleWall_${index}`, { width: 1, height: 1, depth: 1 }, this.scene);
      wall.position = data.position;
      wall.scaling = data.scaling;
      wall.isVisible = false;
      wall.checkCollisions = true;
    });
  }
}
