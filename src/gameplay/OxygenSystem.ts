import UI from "../ui";

export default class OxygenSystem {
  private maxOxygen = 100;
  private oxygen = 100;

  private ui: UI;
  private onEmpty: () => void;
  constructor(ui: UI, onEmpty: () => void) {
    this.ui = ui;
    this.onEmpty = onEmpty;
  }

  update(deltaTime: number): void {
    this.oxygen -= 1 * (deltaTime / 3);

    if (this.oxygen <= 0) {
      this.oxygen = 0;
      this.onEmpty();
    }

    this.ui.updateOxygen(this.oxygen, this.maxOxygen);
  }

  reset(): void {
    this.oxygen = this.maxOxygen;
    this.ui.updateOxygen(this.oxygen, this.maxOxygen);
  }
}
