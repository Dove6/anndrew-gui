/**
 * These imports are written out explicitly because they
 * need to be statically analyzable to be uploaded to CodeSandbox correctly.
 */
import Alexander from './images/Alexander';
import Aliza from './images/Aliza';
import Alvin from './images/Alvin';
import Angie from './images/Angie';
import Arjun from './images/Arjun';
import Blair from './images/Blair';
import Claudia from './images/Claudia';
import Colin from './images/Colin';
import Ed from './images/Ed';
import Effie from './images/Effie';
import Eliot from './images/Eliot';
import Fabian from './images/Fabian';
import Gael from './images/Gael';
import Gerard from './images/Gerard';
import Hasan from './images/Hasan';
import Helena from './images/Helena';
import Ivan from './images/Ivan';
import Katina from './images/Katina';
import Lara from './images/Lara';
import Leo from './images/Leo';
import Lydia from './images/Lydia';
import Maribel from './images/Maribel';
import Milo from './images/Milo';
import Myra from './images/Myra';
import Narul from './images/Narul';
import Norah from './images/Norah';
import Oliver from './images/Oliver';
import Rahul from './images/Rahul';
import Renato from './images/Renato';
import Steve from './images/Steve';
import Tanya from './images/Tanya';
import Tori from './images/Tori';
import Vania from './images/Vania';

export type Person = {
	userId: string;
	name: string;
	role: string;
	avatarUrl: string;
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
	};

	const orderedColumnIds = ['confluence', 'jira', 'trello'];

	return {
		columnMap,
		orderedColumnIds,
	};
}
