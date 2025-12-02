import { forwardRef, memo, type ReactNode } from 'react';
// eslint-disable-next-line @atlaskit/design-system/no-emotion-primitives -- to be migrated to @atlaskit/primitives/compiled – go/akcss
import { Box, xcss } from '@atlaskit/primitives';


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
	return (
		<Box xcss={boardStyles} ref={ref}>
			{children}
		</Box>
	);
});

export default memo(Board);
