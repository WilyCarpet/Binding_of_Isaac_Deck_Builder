import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { DeckOption } from '../app.types';

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

    @Output() seedChange = new EventEmitter<string>();
    @Output() specplayersChange = new EventEmitter<boolean>();
    @Output() playersChange = new EventEmitter<number>();
    @Output() eternalshuffleChange = new EventEmitter<boolean>();
    @Output() ownedOnlyChange = new EventEmitter<boolean>();
    @Output() build = new EventEmitter<void>();
}
