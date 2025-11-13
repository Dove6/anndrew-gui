import { createContext, useContext } from 'react';

import invariant from 'tiny-invariant';

import type { CleanupFn } from '@atlaskit/pragmatic-drag-and-drop/types';

import type { BoardUpdate, CardData, CardUpdate, ColumnData, ColumnUpdate } from '../models';

export type BoardContextValue = {
	getColumns: () => ColumnData[];

	reorderColumn: (args: { startIndex: number; finishIndex: number }) => void;

	reorderCard: (args: { columnId: string; startIndex: number; finishIndex: number }) => void;

	insertColumn: (args: {
		column: ColumnData,
		finishIndex: number;
	}) => void;

	removeColumn: (args: {
		startIndex: number;
	}) => void;

	moveCard: (args: {
		startColumnId: string;
		finishColumnId: string;
		itemIndexInStartColumn: number;
		itemIndexInFinishColumn?: number;
	}) => void;

	insertCard: (args: {
		item: CardData,
		finishColumnId: string;
		itemIndexInFinishColumn?: number;
	}) => void;

	removeCard: (args: {
		startColumnId: string;
		itemIndexInStartColumn: number;
	}) => void;

	registerCard: (args: {
		cardId: string;
		entry: {
			element: HTMLElement;
			actionMenuTrigger: HTMLElement;
		};
	}) => CleanupFn;

	registerColumn: (args: {
		columnId: string;
		entry: {
			element: HTMLElement;
		};
	}) => CleanupFn;

	flashCard: (args: {
		cardId: string;
	}) => void;

	flashColumn: (args: {
		columnId: string;
	}) => void;

	updateCard: (args: {
		columnId: string;
		cardId: string;
		cardUpdate: CardUpdate;
	}) => void;

	updateColumn: (args: {
		columnId: string;
		columnUpdate: ColumnUpdate;
	}) => void;

	updateBoard: (args: {
		boardUpdate: BoardUpdate;
	}) => void;

	instanceId: symbol;
};

export const BoardContext = createContext<BoardContextValue | null>(null);

export function useBoardContext(): BoardContextValue {
	const value = useContext(BoardContext);
	invariant(value, 'cannot find BoardContext provider');
	return value;
}
