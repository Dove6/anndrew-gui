import { forwardRef, memo, type ReactNode, useEffect } from 'react';

import { autoScrollWindowForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
// eslint-disable-next-line @atlaskit/design-system/no-emotion-primitives -- to be migrated to @atlaskit/primitives/compiled – go/akcss
import { Box, xcss } from '@atlaskit/primitives';

import { useBoardContext } from './board-context';

type BoardProps = {
	children: ReactNode;
};

const boardStyles = xcss({
	paddingInlineStart: 'space.200',
	paddingInlineEnd: 'space.200',
	flex: '0 1 auto',
	display: 'flex',
	justifyContent: 'center',
	gap: 'space.200',
	flexDirection: 'row',
	height: 'calc(100vh - 90px)',
});

const Board = forwardRef<HTMLDivElement, BoardProps>(({ children }: BoardProps, ref) => {
	const { instanceId } = useBoardContext();

	useEffect(() => {
		return autoScrollWindowForElements({
			canScroll: ({ source }) => source.data.instanceId === instanceId,
		});
	}, [instanceId]);

	return (
		<Box xcss={boardStyles} ref={ref}>
			{children}
		</Box>
	);
});

export default memo(Board);
