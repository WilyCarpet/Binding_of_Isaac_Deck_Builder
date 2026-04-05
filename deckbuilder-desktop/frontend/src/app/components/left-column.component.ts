import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { RatioValues } from '../app.types';

@Component({
    selector: 'app-left-column',
    imports: [CommonModule, FormsModule],
    templateUrl: './left-column.component.html',
    styleUrl: './left-column.component.scss'
})
export class LeftColumnComponent {
    @Input({ required: true }) ratio!: 'o' | 'd' | 'c';
    @Input({ required: true }) ratioValues!: RatioValues;
    @Input({ required: true }) labelMap!: Record<string, string>;
    @Input({ required: true }) lootKeys!: readonly string[];
    @Input({ required: true }) monsterKeys!: readonly string[];
    @Input({ required: true }) treasureKeys!: readonly string[];

    @Output() ratioChange = new EventEmitter<'o' | 'd' | 'c'>();
}
