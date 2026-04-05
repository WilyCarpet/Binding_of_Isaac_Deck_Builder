import { CardRecord } from './app.types';

const BACKEND_BASE_URL = 'http://127.0.0.1:5001';

function clean(value: string | undefined): string {
    return (value ?? '').trim();
}

function toBackendImageUrl(localPath: string): string {
    const normalized = localPath.replace(/\\/g, '/');
    const filename = normalized.split('/').pop();

    if (!filename) {
        return '';
    }

    return `${BACKEND_BASE_URL}/card-images/${encodeURIComponent(filename)}`;
}

export function getCardImageCandidates(card: CardRecord): string[] {
    const candidates: string[] = [];
    const imageUrl = clean(card['Image URL']);
    const localPath = clean(card['Image Local Path']);

    if (imageUrl) {
        candidates.push(imageUrl);
    }

    if (localPath) {
        if (/^https?:\/\//i.test(localPath) || /^data:image\//i.test(localPath)) {
            candidates.push(localPath);
        } else {
            const backendImageUrl = toBackendImageUrl(localPath);
            if (backendImageUrl) {
                candidates.push(backendImageUrl);
            }

            if (localPath.startsWith('/')) {
                candidates.push(`file://${localPath}`);
            }
        }
    }

    return [...new Set(candidates.filter(Boolean))];
}

export function getCardPrimaryImage(card: CardRecord): string {
    return getCardImageCandidates(card)[0] ?? '';
}
