/**
 * These imports are written out explicitly because they
 * need to be statically analyzable to be uploaded to CodeSandbox correctly.
 */
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

export type Person = {
	userId: string;
	name: string;
	role: string;
	avatarUrl: string;
	isSource?: boolean;
};

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

let sharedLookupIndex: number = 0;

/**
 * Note: this does not use randomness so that it is stable for VR tests
 */
export function getPerson(): Person {
	sharedLookupIndex++;
	return getPersonFromPosition({ position: sharedLookupIndex });
}

export function getPersonFromPosition({ position }: { position: number }): Person {
	// use the next name
	const name = names[position % names.length];
	// use the next role
	const role = roles[position % roles.length];
	return {
		userId: `id:${position}`,
		name,
		role,
		avatarUrl: avatarMap[name],
	};
}

export function getPeopleFromPosition({
	amount,
	startIndex,
}: {
	amount: number;
	startIndex: number;
}): Person[] {
	return Array.from({ length: amount }, () => getPersonFromPosition({ position: startIndex++ }));
}

export function getPeople({ amount }: { amount: number }): Person[] {
	return Array.from({ length: amount }, () => getPerson());
}

export type ColumnType = {
	title: string;
	columnId: string;
	draggable?: boolean;
	items: Person[];
};
export type ColumnMap = { [columnId: string]: ColumnType };

export function getData({
	columnCount,
	itemsPerColumn,
}: {
	columnCount: number;
	itemsPerColumn: number;
}) {
	const columnMap: ColumnMap = {};

	for (let i = 0; i < columnCount; i++) {
		const column: ColumnType = {
			title: `Column ${i}`,
			columnId: `column-${i}`,
			items: getPeople({ amount: itemsPerColumn }),
		};
		columnMap[column.columnId] = column;
	}
	const orderedColumnIds = Object.keys(columnMap);

	return {
		columnMap,
		orderedColumnIds,
		lastOperation: null,
	};
}

export function getBasicData() {
	const columnMap: ColumnMap = {
		confluence: {
			title: 'Confluence',
			columnId: 'confluence',
			items: getPeople({ amount: 10 }),
		},
		jira: {
			title: 'Jira',
			columnId: 'jira',
			items: getPeople({ amount: 10 }),
		},
		trello: {
			title: 'Trello',
			columnId: 'trello',
			items: getPeople({ amount: 10 }),
		},
		main: {
			title: 'Main',
			columnId: 'main',
			items: getPeople({ amount: 5 }).map(item => ({ ...item, isSource: true })),
			draggable: false,
		},
	};

	const orderedColumnIds = ['main', 'confluence', 'jira', 'trello'];

	return {
		columnMap,
		orderedColumnIds,
	};
}

export type BoardProps = {
	ref?: React.Ref<HTMLDivElement> | undefined;
};
