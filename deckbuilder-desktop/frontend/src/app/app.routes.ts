import { Routes } from '@angular/router';
import { CollectionComponent } from './components/collection/collection.component';
import { DeckBuilderComponent } from './components/deck-builder/deck-builder';

export const routes: Routes = [
    { path: '', pathMatch: 'full', redirectTo: 'deck-builder' },
    { path: 'deck-builder', component: DeckBuilderComponent },
    { path: 'collection', component: CollectionComponent },
    { path: '**', redirectTo: 'deck-builder' },
];
