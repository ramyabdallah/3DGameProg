import { 
  Engine, 
  Scene, 
  UniversalCamera, 
  Vector3 
} from "@babylonjs/core";
import "@babylonjs/loaders";

import UI from "./ui";
import AudioManager from "./audio/AudioManager";
import WorldBuilder from "./world/WorldBuilder";
import DoorSystem from "./gameplay/DoorSystem";
import ArtifactSystem from "./gameplay/ArtifactSystem";
import ArchiveLoader from "./gameplay/ArchiveLoader";
import MonsterController from "./monster/MonsterController";
import PlayerController from "./player/PlayerController";
import OxygenSystem from "./gameplay/OxygenSystem";
import EscapeSystem from "./gameplay/EscapeSystem";

export default class App {
  private canvas: HTMLCanvasElement;
  private engine: Engine;
  private scene!: Scene;
  private camera!: UniversalCamera;

  private ui!: UI;
  private audio!: AudioManager;
  private world!: WorldBuilder;
  private doors!: DoorSystem;
  private artifacts!: ArtifactSystem;
  private monster!: MonsterController;
  private player!: PlayerController;
  private oxygen!: OxygenSystem;
  private escape!: EscapeSystem;
  private archiveLoader!: ArchiveLoader;

  private gameEnded = false;
  private gameStarted = false;
  private gamePaused = false;
  private collectPressed = false;
  private escalationPlayed = false;
  private creatureDetected = false;
  private startPosition = new Vector3(0, 2, -10);

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.id = "gameCanvas";
    document.body.appendChild(this.canvas);
    this.engine = new Engine(this.canvas, true);
  }

  start(): void {
    this.scene = new Scene(this.engine);
    this.ui = new UI(() => this.restartGame());
    this.audio = new AudioManager();
    this.audio.setup();
    this.audio.playMenuMusic();
    this.ui.setAudio(this.audio);

    this.world = new WorldBuilder(this.scene);
    this.camera = this.world.create(this.startPosition, this.canvas);

    this.doors = new DoorSystem(this.scene, () => this.startMonsterChase(), this.audio);
    this.artifacts = new ArtifactSystem(this.scene);
    this.player = new PlayerController(this.scene, this.camera, this.world.terrain, []);
    this.monster = new MonsterController(
      this.scene,
      this.audio,
      [],
      (x, z) => this.player.getTerrainHeightAt(x, z),
      () => this.mawCaughtPlayer()
    );
    this.oxygen = new OxygenSystem(this.ui, () => this.endGame());
    this.escape = new EscapeSystem(this.camera, () => this.winGame());

    this.archiveLoader = new ArchiveLoader(this.scene, this.doors, this.artifacts, this.monster);
    void this.archiveLoader.load().then(() => {
      this.player.setCollisionMeshes(this.archiveLoader.collisionMeshes);
      this.monster.setCollisionMeshes(this.archiveLoader.collisionMeshes);
      this.ui.updateArtifacts(this.artifacts.getCollectedCount(), this.artifacts.getTotalCount());
    });

    this.ui.showMainMenu(
      () => {
        this.audio.stopMenuMusic();
        this.ui.hideMainMenu();
        this.ui.showLoadingScreen("Entering the drowned archive...");

        window.setTimeout(() => {
          this.ui.hideLoadingScreen();

          this.ui.showIntroSequence(() => {
            this.gameStarted = true;
            this.gamePaused = false;

            this.audio.playBaseAmbience();
            this.canvas.requestPointerLock();
          });
        }, 900);
      },
      () => this.ui.showControlsPanel(),
      () => this.ui.showContextPanel()
    );

    this.ui.updateArtifacts(this.artifacts.getCollectedCount(), this.artifacts.getTotalCount());
    this.setupInput();

    this.engine.runRenderLoop(() => {
      if (!this.gameEnded && this.gameStarted && !this.gamePaused) {
        const deltaTime = this.engine.getDeltaTime() / 1000;
        this.player.update(deltaTime);
        this.updateInteriorFog();
        this.monster.update(deltaTime);
        this.ui.setChaseEffect(this.monster.isChasing());
        this.oxygen.update(deltaTime);
        this.escape.update();
        this.updateArtifactInteraction();
      }
      this.scene.render();
    });

    window.addEventListener("resize", () => this.engine.resize());
  }

  private setupInput(): void {
    window.addEventListener("keydown", (event) => {
      this.player.keys[event.key.toLowerCase()] = true;

      if (event.key === "Escape") {
        event.preventDefault();
        if (this.gameStarted && !this.gameEnded && !this.gamePaused) this.pauseGame();
        return;
      }

      if (event.key.toLowerCase() === "e") {
        this.collectPressed = true;
        this.doors.tryToggleDoor();
      }
    });

    window.addEventListener("keyup", (event) => {
      this.player.keys[event.key.toLowerCase()] = false;
    });

    this.canvas.addEventListener("click", () => {
      if (!this.gameEnded) this.canvas.requestPointerLock();
    });

    document.addEventListener("pointerlockchange", () => {
      if (this.gameStarted && !this.gameEnded && !this.gamePaused && document.pointerLockElement !== this.canvas) {
        this.pauseGame();
      }
    });
  }

  private updateInteriorFog(): void {
    const position = this.camera.position;

    const insideArchive =
      position.z > 10 &&
      position.z < 115 &&
      position.x > -100 &&
      position.x < 100 &&
      position.y > 1 &&
      position.y < 100;

    const targetFogDensity = insideArchive ? 0.055 : 0.012;

    this.scene.fogDensity +=
      (targetFogDensity - this.scene.fogDensity) * 0.04;
  }

  private updateArtifactInteraction(): void {
    const targetedArtifact = this.artifacts.updateTargetedArtifact();
    targetedArtifact ? this.ui.showInteractionPrompt() : this.ui.hideInteractionPrompt();

    if (this.collectPressed && targetedArtifact) {
      const collected = this.artifacts.collectTargetedArtifact();
      if (collected) {
        this.audio.playArtifactPickupSound();
        const collectedCount = this.artifacts.getCollectedCount();
        const totalCount = this.artifacts.getTotalCount();

        if (collectedCount >= 2 && !this.escalationPlayed && !this.creatureDetected && !this.monster.isChasing()) {
          this.escalationPlayed = true;
          this.audio.playMawLowRoar();
          this.audio.stopBaseAmbience();
          this.audio.playArtifactEscalation();
        }

        this.ui.updateArtifacts(collectedCount, totalCount);

        if (collectedCount >= totalCount) {
          this.escape.setAllArtifactsCollected();
          this.ui.showEscapeObjective();
        }
      }
    }

    this.collectPressed = false;
  }

  private startMonsterChase(): void {
    this.creatureDetected = true;
    this.monster.startChase();
  }

  private pauseGame(): void {
    if (this.gamePaused || this.gameEnded || !this.gameStarted) return;
    this.gamePaused = true;
    this.ui.showPauseMenu(() => this.resumeGame(), () => this.ui.showControlsPanel(), () => window.location.reload());
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
  }

  private resumeGame(): void {
    if (!this.gamePaused || this.gameEnded) return;
    this.gamePaused = false;
    this.ui.hidePauseMenu();
    this.canvas.requestPointerLock();
  }

  private restartGame(): void {
    this.ui.showLoadingScreen("Returning to the depths...");
    
    window.setTimeout(() => {
      this.gameEnded = false;
      this.collectPressed = false;
      this.creatureDetected = false;
      this.escalationPlayed = false;
      this.gameStarted = true;
      this.gamePaused = false;

      this.audio.stopAllMusic();
      this.audio.stopMawSounds();
      this.audio.resetMawLowRoar();
      this.audio.playBaseAmbience();

      this.doors.reset();
      this.artifacts.reset();
      this.monster.reset();
      this.oxygen.reset();
      this.escape.reset();
      this.player.reset(this.startPosition);

      this.ui.hidePauseMenu();
      this.ui.hideMainMenu();
      this.ui.updateObjective("Collect all artifacts");
      this.ui.updateArtifacts(this.artifacts.getCollectedCount(), this.artifacts.getTotalCount());
      this.ui.hideEndScreen();
      this.ui.hideInteractionPrompt();
      this.ui.setChaseEffect(false);
      this.ui.hideLoadingScreen();
      this.canvas.requestPointerLock();
    }, 3000);
  }

  private mawCaughtPlayer(): void {
    if (this.gameEnded) return;

    this.gameEnded = true;

    this.monster.stopChase();
    this.audio.stopAllMusic();
    this.audio.stopMawRoarLoop();

    this.ui.setChaseEffect(false);

    if (document.pointerLockElement === this.canvas) {
      document.exitPointerLock();
    }

    this.audio.playMawRoar();

    this.ui.showMawDeathTransition(() => {
      this.audio.stopMawSounds();

      const deathFade = document.getElementById("maw-death-fade");
      if (deathFade) {
        deathFade.style.display = "none";
      }

      this.ui.showGameOver();
    });
  }

  private endGame(): void {
    if (this.gameEnded) return;
    this.gameEnded = true;
    this.monster.stopChase();
    this.audio.stopAllMusic();
    this.audio.stopMawSounds();
    this.ui.setChaseEffect(false);
    this.ui.showGameOver();
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
  }

  private winGame(): void {
    if (this.gameEnded) return;
    this.gameEnded = true;
    this.monster.stopChase();
    this.audio.stopAllMusic();
    this.audio.stopMawSounds();
    this.ui.setChaseEffect(false);
    this.ui.showWin();
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
  }
}
