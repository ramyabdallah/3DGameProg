export default class UI {
  private oxygenFill: HTMLDivElement;
  private oxygenText: HTMLDivElement;

  private artifactCounter: HTMLDivElement;

  private endScreen: HTMLDivElement;
  private endTitle: HTMLDivElement;
  private restartButton: HTMLButtonElement;
  private quitButton: HTMLButtonElement;
  private interactionPrompt: HTMLDivElement;

  private chaseBorderTimeout?: number;
  private chaseEffectAlreadyStarted = false;

  constructor(onRestart: () => void) {
    const container = document.createElement("div");
    container.id = "ui-container";

    container.innerHTML = `
        <div id="oxygen-wrapper">
            <div id="oxygen-label">O₂</div>
            <div id="oxygen-bar">
            <div id="oxygen-fill"></div>
            </div>
            <div id="oxygen-text">100%</div>
        </div>

        <div id="artifact-wrapper">
            <div id="artifact-icon">🏺</div>
            <div id="artifact-counter">0 / 3</div>
        </div>

        <div id="objective-wrapper">
            <div id="objective-label">OBJECTIVE</div>
            <div id="objectiveText">Collect all artifacts</div>
        </div>

        <div id="crosshair"></div>
        <div id="interaction-prompt" class="hidden">E to collect</div>

        <div id="end-screen" class="hidden">
          <div id="end-title">GAME OVER</div>

          <div id="end-buttons">
            <button id="restart-button">Restart</button>
            <button id="quit-button">Quit</button>
          </div>
        </div>
    `;

    document.body.appendChild(container);

    this.oxygenFill = document.getElementById("oxygen-fill") as HTMLDivElement;
    this.oxygenText = document.getElementById("oxygen-text") as HTMLDivElement;
    this.artifactCounter = document.getElementById("artifact-counter") as HTMLDivElement;
    this.endScreen = document.getElementById("end-screen") as HTMLDivElement;
    this.endTitle = document.getElementById("end-title") as HTMLDivElement;
    this.restartButton = document.getElementById("restart-button") as HTMLButtonElement;
    this.quitButton = document.getElementById("quit-button") as HTMLButtonElement;  
    this.interactionPrompt = document.getElementById("interaction-prompt") as HTMLDivElement;

    this.restartButton.addEventListener("click", onRestart);
    this.quitButton.addEventListener("click", () => {
      window.location.reload();
    });
  }

  updateObjective(text: string, animate = false): void {
    const objective = document.getElementById("objectiveText");
    if (!objective) return;

    objective.textContent = text;

    if (animate) {
      objective.classList.remove("objectivePulse");

      void objective.offsetWidth;

      objective.classList.add("objectivePulse");
    }
  }

  updateOxygen(current: number, max: number): void {
    const percent = Math.max(0, Math.min(1, current / max));
    const displayPercent = Math.round(percent * 100);

    this.oxygenFill.style.height = `${displayPercent}%`;
    this.oxygenText.textContent = `${displayPercent}%`;

    if (displayPercent <= 25) {
      this.oxygenFill.style.background = "#ff3b3b";
    } else if (displayPercent <= 50) {
      this.oxygenFill.style.background = "#ffb347";
    } else {
      this.oxygenFill.style.background = "#4cc9f0";
    }
  }

  updateArtifacts(current: number, total: number): void {
    this.artifactCounter.textContent = `${current} / ${total}`;
  }

  showInteractionPrompt(): void {
    this.interactionPrompt.classList.remove("hidden");
  }

  hideInteractionPrompt(): void {
    this.interactionPrompt.classList.add("hidden");
  }

  showGameOver(): void {
    this.endTitle.textContent = "GAME OVER";
    this.endScreen.classList.remove("hidden");
  }

  showWin(): void {
    this.endTitle.textContent = "YOU ESCAPED";
    this.endScreen.classList.remove("hidden");
  }

  hideEndScreen(): void {
    this.endScreen.classList.add("hidden");
  }

  showEscapeObjective(): void {
    this.updateObjective("Escape the building", true);
  }


  setChaseEffect(active: boolean): void {
    let border = document.getElementById("chaseBorder");
    let text = document.getElementById("chaseText");

    if (!border) {
      border = document.createElement("div");
      border.id = "chaseBorder";
      document.body.appendChild(border);
    }

    if (!text) {
      text = document.createElement("div");
      text.id = "chaseText";
      text.innerText = "YOU'RE BEING CHASED!!";
      document.body.appendChild(text);
    }

    if (active) {
      text.style.display = "block";

      if (!this.chaseEffectAlreadyStarted) {
        this.chaseEffectAlreadyStarted = true;

        border.style.display = "block";

        this.chaseBorderTimeout = window.setTimeout(() => {
          border!.style.display = "none";
        }, 5000);
      }

      return;
    }

    // Reset everything when chase ends / player dies / restart / win
    border.style.display = "none";
    text.style.display = "none";
    this.chaseEffectAlreadyStarted = false;

    if (this.chaseBorderTimeout) {
      clearTimeout(this.chaseBorderTimeout);
      this.chaseBorderTimeout = undefined;
    }
  }

  showMainMenu(
    onStart: () => void,
    onControls: () => void,
    onContext: () => void
  ): void {
    let menu = document.getElementById("mainMenu");

    if (!menu) {
      menu = document.createElement("div");
      menu.id = "mainMenu";
      menu.innerHTML = `
        <h1>THE DROWNED ARCHIVE</h1>

        <div id="mainMenuButtons">
          <button id="startGameBtn">Start Game</button>
          <button id="mainControlsBtn">Controls</button>
          <button id="contextBtn">Context</button>
        </div>

        <div id="mainMenuContent"></div>
      `;
      document.body.appendChild(menu);
    }

    menu.style.display = "flex";

    document.getElementById("startGameBtn")!.onclick = onStart;
    document.getElementById("mainControlsBtn")!.onclick = onControls;
    document.getElementById("contextBtn")!.onclick = onContext;
  }

  hideMainMenu(): void {
    const menu = document.getElementById("mainMenu");
    if (menu) menu.style.display = "none";
  }

  showPauseMenu(
    onResume: () => void,
    onControls: () => void,
    onQuit: () => void
  ): void {
    let menu = document.getElementById("pauseMenu");

    if (!menu) {
      menu = document.createElement("div");
      menu.id = "pauseMenu";
      menu.innerHTML = `
        <h1>PAUSED</h1>

        <div id="pauseMenuButtons">
          <button id="resumeBtn">Resume</button>
          <button id="pauseControlsBtn">Controls</button>
          <button id="quitBtn">Quit</button>
        </div>

        <div id="pauseMenuContent"></div>
      `;
      document.body.appendChild(menu);
    }

    menu.style.display = "flex";

    document.getElementById("resumeBtn")!.onclick = onResume;
    document.getElementById("pauseControlsBtn")!.onclick = onControls;
    document.getElementById("quitBtn")!.onclick = onQuit;
  }

  hidePauseMenu(): void {
    const menu = document.getElementById("pauseMenu");
    if (menu) menu.style.display = "none";
  }

  showControlsPanel(): void {
    const mainButtons = document.getElementById("mainMenuButtons");
    const mainContent = document.getElementById("mainMenuContent");
    const mainTitle = document.querySelector("#mainMenu h1") as HTMLElement;

    const pauseButtons = document.getElementById("pauseMenuButtons");
    const pauseContent = document.getElementById("pauseMenuContent");
    const pauseTitle = document.querySelector("#pauseMenu h1") as HTMLElement;

    const pauseMenuVisible =
      document.getElementById("pauseMenu")?.style.display === "flex";

    const buttons = pauseMenuVisible ? pauseButtons : mainButtons;
    const content = pauseMenuVisible ? pauseContent : mainContent;
    const title = pauseMenuVisible ? pauseTitle : mainTitle;

    if (!buttons || !content) return;

    buttons.style.display = "none";
    if (title) {
      title.style.display = "none";
    }

    content.innerHTML = `
      <div class="menuContentFade">
        <h2 class="menuSectionTitle">CONTROLS</h2>

        <div class="controlsGrid">
          <div>Move Forward</div><div>W / Z</div>
          <div>Move Backward</div><div>S</div>
          <div>Move Left</div><div>A / Q</div>
          <div>Move Right</div><div>D</div>
          <div>Sprint</div><div>SHIFT</div>
          <div>Swim Up</div><div>SPACE</div>
          <div>Swim Down</div><div>CTRL</div>
          <div>Interact / Collect</div><div>E</div>
          <div>Pause</div><div>ESC</div>
        </div>

        <button id="backFromControls" class="menuBackArrow">←</button>
      </div>
    `;

    document.getElementById("backFromControls")!.onclick = () => {
      content.innerHTML = "";
      buttons.style.display = "flex";
      if (title) title.style.display = "block";
    };
  }

  showContextPanel(): void {
    const buttons = document.getElementById("mainMenuButtons");
    const content = document.getElementById("mainMenuContent");
    const title = document.querySelector("#mainMenu h1") as HTMLElement;

    if (!buttons || !content) return;

    buttons.style.display = "none";
    if (title) {
      title.style.display = "none";
    }

    content.innerHTML = `
      <div class="menuContentFade">
        <h2 class="menuSectionTitle">CONTEXT</h2>

        <p class="contextText">
          Elias Veyron — an ambitious marine archaeologist and obsessive collector
          of lost relics — receives disturbing information from a close friend
          about a forgotten structure hidden in the deepest regions of the western Pacific Ocean.
        </p>

        <p class="contextText">
          Rumored to be known as <strong>The Abyssal Archive</strong>, the abandoned
          underwater facility supposedly sank decades ago while transporting artifacts
          of unimaginable historical and financial value.
        </p>

        <p class="contextText">
          Many divers and explorers attempted to uncover its secrets.
        </p>

        <p class="contextText">
          None ever returned.
        </p>

        <p class="contextText">
          Warned to stay away, Elias instead becomes consumed by the opportunity.
          Driven by greed, curiosity, and the desire to become the first survivor
          to uncover the Archive’s treasures, he descends into the abyss alone.
        </p>

        <p class="contextText">
          But something ancient still lurks within the drowned halls.
        </p>

        <p class="contextText finalWarning">
          Something watching.<br>
          Something waiting.
        </p>

        <button id="backFromContext" class="menuBackArrow">←</button>
      </div>
    `;

    const backBtn = document.getElementById("backFromContext");

    if (backBtn) {
      backBtn.onclick = () => {
        content.innerHTML = "";
        if (title) {
          title.style.display = "block";
        }
        buttons.style.display = "flex";
      };
    }
  }
}