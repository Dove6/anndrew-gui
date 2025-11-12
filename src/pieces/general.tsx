// eslint-disable-next-line @atlaskit/design-system/no-emotion-primitives -- to be migrated to @atlaskit/primitives/compiled – go/akcss
import { Box, xcss } from '@atlaskit/primitives';

type GeneralProps = {
	author: string;
	description: string;
	fps: number;
	opacity: number;
};

const generalStyles = xcss({
	display: 'flex',
	justifyContent: 'center',
	gap: 'space.200',
	flexDirection: 'row',
	fontSize: 'larger',
	marginBottom: 'space.100',
});

const General = ({ author, description, fps, opacity }: GeneralProps) => {
	return (
		<Box xcss={generalStyles}>
			<Box>
				{`Author: ${author}`}
			</Box>
			<Box>
				{`Description: ${description}`}
			</Box>
			<Box>
				{`FPS: ${fps}`}
			</Box>
			<Box>
				{`Opacity: ${opacity}`}
			</Box>
		</Box>
	);
};

export default General;
