export type BoardState = {
	columnMap: ColumnMap;
	orderedColumnIds: string[];

	filename: string,
	fps: number,
	opacity: number,
	author: string,
	description: string,

	lastOperation: Operation | null;
};

export type BoardUpdate = {
	filename?: string,
	fps?: number,
	opacity?: number,
	author?: string,
	description?: string,
}

export type ColumnMap = { [columnId: string]: ColumnData };

export type ColumnData = ImageColumn | EventColumn;

export type ImageColumn = {
	type: 'image-column';
	columnId: string;
	items: CardData[];
}

export type EventColumn = {
	type: 'event-column';
	columnId: string;
	items: CardData[];

	name: string;
	loopLength: number;
	opacity: number;
}

export type ColumnUpdate = ImageColumnUpdate | EventColumnUpdate;

export type ImageColumnUpdate = {
	type: 'image-column';
}

export type EventColumnUpdate = {
	type: 'event-column';

	name?: string;
	loopLength?: number;
	opacity?: number;
}

export type CardData = ImageCard | FrameCard;

export type ImageCard = {
	type: 'image-card';
	cardId: string;

	name: string;
	contentUrl: string;
	offset: {
		x: number;
		y: number;
	};
};

export type FrameCard = {
	type: 'frame-card';
	cardId: string;

	name: string;
	imageRef: ImageCard;
	offset: {
		x: number;
		y: number;
	};
	sfx: string[];
	opacity: number;
};

export type CardUpdate = ImageCardUpdate | FrameCardUpdate;

export type ImageCardUpdate = {
	type: 'image-card';

	name?: string;
	contentUrl?: string;
	offsetX?: number;
	offsetY?: number;
};

export type FrameCardUpdate = {
	type: 'frame-card';

	name?: string;
	imageRef?: ImageCard;
	offsetX?: number;
	offsetY?: number;
	sfx?: string[];
	opacity?: number;
};

export const getNextCardId = () => crypto.randomUUID();
export const getNextColumnId = () => crypto.randomUUID();

export function getFrame(image: ImageCard): FrameCard {
	const position = getNextCardId();
	return {
		type: 'frame-card',
		cardId: `frame:${position}`,
		name: image.name,
		offset: { x: 0, y: 0 },
		imageRef: image,
		opacity: 255,
		sfx: [],
	};
}

export type BoardProps = {
	ref?: React.Ref<HTMLDivElement> | undefined;
};

export type Outcome =
	| {
		type: 'column-reorder';
		columnId: string;
		startIndex: number;
		finishIndex: number;
	}
	| {
		type: 'column-insert';
		columnId: string;
		finishIndex: number;
	}
	| {
		type: 'column-remove';
		columnId: string;
		startIndex: number;
	}
	| {
		type: 'card-reorder';
		columnId: string;
		startIndex: number;
		finishIndex: number;
	}
	| {
		type: 'card-move';
		finishColumnId: string;
		itemIndexInStartColumn: number;
		itemIndexInFinishColumn: number;
	}
	| {
		type: 'card-insert';
		finishColumnId: string;
		itemIndexInFinishColumn: number;
	}
	| {
		type: 'card-remove';
		startColumnId: string;
		itemIndexInStartColumn: number;
	};

export type Trigger = 'pointer' | 'keyboard';

export type Operation = {
	trigger: Trigger;
	outcome: Outcome;
};
