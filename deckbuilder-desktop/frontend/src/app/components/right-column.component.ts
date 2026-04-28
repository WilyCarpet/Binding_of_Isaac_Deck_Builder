import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { DeckOption, SavedConfig } from '../app.types';

@Component({
    selector: 'app-right-column',
    imports: [CommonModule, FormsModule],
    templateUrl: './right-column.component.html',
    styleUrl: './right-column.component.scss'
})
export class RightColumnComponent {
    @Input({ required: true }) seed!: string;
    @Input({ required: true }) specplayers!: boolean;
    @Input({ required: true }) players!: number;
    @Input({ required: true }) eternalshuffle!: boolean;
    @Input({ required: true }) coreDeckState!: DeckOption[];
    @Input({ required: true }) promoDeckState!: DeckOption[];
    @Input({ required: true }) otherDeckState!: DeckOption[];
    @Input({ required: true }) building!: boolean;
    @Input({ required: true }) buildError!: string;
    @Input({ required: true }) ownedOnly!: boolean;
    @Input() savedConfigs: SavedConfig[] = [];
    @Input() configNameInput: string = '';

    @Output() seedChange = new EventEmitter<string>();
    @Output() specplayersChange = new EventEmitter<boolean>();
    @Output() playersChange = new EventEmitter<number>();
    @Output() eternalshuffleChange = new EventEmitter<boolean>();
    @Output() ownedOnlyChange = new EventEmitter<boolean>();
    @Output() build = new EventEmitter<void>();
    @Output() configNameInputChange = new EventEmitter<string>();
    @Output() saveConfig = new EventEmitter<void>();
    @Output() loadConfig = new EventEmitter<SavedConfig>();
    @Output() deleteConfig = new EventEmitter<string>();
    @Output() deckSelectionChanged = new EventEmitter<void>();

    selectedConfigIndex: string = '';

    toggleAll(group: DeckOption[], checked: boolean): void {
        for (const d of group) {
            d.checked = checked;
        }
        this.deckSelectionChanged.emit();
    }

    onLoadConfig(): void {
        const idx = +this.selectedConfigIndex;
        if (idx >= 0 && idx < this.savedConfigs.length) {
            this.loadConfig.emit(this.savedConfigs[idx]);
        }
    }

    onDeleteConfig(): void {
        const idx = +this.selectedConfigIndex;
        if (idx >= 0 && idx < this.savedConfigs.length) {
            this.deleteConfig.emit(this.savedConfigs[idx].name);
            this.selectedConfigIndex = '';
        }
    }
}
