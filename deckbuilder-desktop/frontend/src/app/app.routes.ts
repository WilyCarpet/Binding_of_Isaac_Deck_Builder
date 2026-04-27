import { Routes } from '@angular/router';
import { CollectionComponent } from './components/collection/collection.component';
import { DeckBuilderComponent } from './components/deck-builder/deck-builder';
import { SetupComponent } from './components/setup/setup.component';

export const routes: Routes = [
    { path: 'setup', component: SetupComponent },
    { path: '', pathMatch: 'full', redirectTo: 'deck-builder' },
    { path: 'deck-builder', component: DeckBuilderComponent },
    { path: 'collection', component: CollectionComponent },
    { path: '**', redirectTo: 'deck-builder' },
];
