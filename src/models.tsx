export type BoardState = {
	columnMap: ColumnMap;
	orderedColumnIds: string[];

	fps: number,
	opacity: number,
	author: string,
	description: string,

	lastOperation: Operation | null;
};

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

export type CardData = ImageCard | FrameCard;

export type ImageCard = {
	type: 'image-card';
	cardId: string;

	name: string,
	contentUrl: string,
	offset: {
		x: number,
		y: number,
	},
};

export type FrameCard = {
	type: 'frame-card';
	cardId: string;

	name: string,
	imageRef: ImageCard,
	offset: {
		x: number,
		y: number,
	},
	sfx: string[],
	opacity: number,
};

export function getInitialBoardState(): BoardState {
	const images = new Array(5).fill(null).map(_ => getImage());

	const getFrames = (length: number) => new Array(length).fill(null).map(_ => getFrame(images[Math.trunc(Math.random() * 100) % images.length]))

	const columns: ColumnData[] = [
		{
			type: 'event-column',
			name: 'ONCLICK',
			columnId: 'onclick',
			items: getFrames(5),
			loopLength: 0,
			opacity: 255,
		},
		{
			type: 'event-column',
			name: 'SPEAKING',
			columnId: 'speaking',
			items: getFrames(6),
			loopLength: 0,
			opacity: 255,
		},
		{
			type: 'event-column',
			name: 'ONFOCUS',
			columnId: 'onfocus',
			items: getFrames(2),
			loopLength: 0,
			opacity: 255,
		},
		{
			type: 'image-column',
			columnId: 'main',
			items: images,
		},
	];

	const columnMap: ColumnMap = Object.fromEntries<ColumnData>(columns.map(column => [column.columnId, column]));
	columns.sort((a, b) => a.type !== b.type ? (a.type == 'event-column' ? 1 : -1) : 0);
	const orderedColumnIds = columns.map(column => column.columnId);

	return {
		columnMap,
		orderedColumnIds,

		fps: 16,
		opacity: 255,
		author: 'You',
		description: '',

		lastOperation: null,
	};
}

export const getNextCardId = () => Math.trunc(Math.random() * 1000000);

export function getImage(): ImageCard {
	const position = getNextCardId();
	const name = names[position % names.length];
	return {
		type: 'image-card',
		cardId: `id:${position}`,
		name,
		offset: { x: 0, y: 0 },
		contentUrl: avatarMap[name],
	};
}

export function getFrame(image: ImageCard): FrameCard {
	const position = getNextCardId();
	const role = roles[position % roles.length];
	return {
		type: 'frame-card',
		cardId: `id:${position}`,
		name: `${image.name} / ${role}`,
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
	};

export type Trigger = 'pointer' | 'keyboard';

export type Operation = {
	trigger: Trigger;
	outcome: Outcome;
};


import Alexander from './avatars/Alexander';
import Aliza from './avatars/Aliza';
import Alvin from './avatars/Alvin';
import Angie from './avatars/Angie';
import Arjun from './avatars/Arjun';
import Blair from './avatars/Blair';
import Claudia from './avatars/Claudia';
import Colin from './avatars/Colin';
import Ed from './avatars/Ed';
import Effie from './avatars/Effie';
import Eliot from './avatars/Eliot';
import Fabian from './avatars/Fabian';
import Gael from './avatars/Gael';
import Gerard from './avatars/Gerard';
import Hasan from './avatars/Hasan';
import Helena from './avatars/Helena';
import Ivan from './avatars/Ivan';
import Katina from './avatars/Katina';
import Lara from './avatars/Lara';
import Leo from './avatars/Leo';
import Lydia from './avatars/Lydia';
import Maribel from './avatars/Maribel';
import Milo from './avatars/Milo';
import Myra from './avatars/Myra';
import Narul from './avatars/Narul';
import Norah from './avatars/Norah';
import Oliver from './avatars/Oliver';
import Rahul from './avatars/Rahul';
import Renato from './avatars/Renato';
import Steve from './avatars/Steve';
import Tanya from './avatars/Tanya';
import Tori from './avatars/Tori';
import Vania from './avatars/Vania';

const avatarMap: Record<string, string> = {
	Alexander,
	Aliza,
	Alvin,
	Angie,
	Arjun,
	Blair,
	Claudia,
	Colin,
	Ed,
	Effie,
	Eliot,
	Fabian,
	Gael,
	Gerard,
	Hasan,
	Helena,
	Ivan,
	Katina,
	Lara,
	Leo,
	Lydia,
	Maribel,
	Milo,
	Myra,
	Narul,
	Norah,
	Oliver,
	Rahul,
	Renato,
	Steve,
	Tanya,
	Tori,
	Vania,
};

const names: string[] = Object.keys(avatarMap);

const roles: string[] = [
	'Engineer',
	'Senior Engineer',
	'Principal Engineer',
	'Engineering Manager',
	'Designer',
	'Senior Designer',
	'Lead Designer',
	'Design Manager',
	'Content Designer',
	'Product Manager',
	'Program Manager',
];
