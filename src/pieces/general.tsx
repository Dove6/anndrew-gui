// eslint-disable-next-line @atlaskit/design-system/no-emotion-primitives -- to be migrated to @atlaskit/primitives/compiled – go/akcss
import { Box, Inline, xcss } from '@atlaskit/primitives';
import Textfield from '@atlaskit/textfield';
import { IconButton } from '@atlaskit/button/new';
import DeleteIcon from '@atlaskit/icon/core/delete';
import { useBoardContext } from './board-context';
import Image from '@atlaskit/image';

import KrabikImage from '../avatars/Krabik.png';

type GeneralProps = {
	author: string;
	description: string;
	fps: number;
	opacity: number;
};

const generalStyles = xcss({
	display: 'flex',
	flexDirection: 'row',
	justifyContent: 'space-between',
	marginBlock: 'space.100',
	paddingInline: 'space.200',
	gap: 'space.200',
});

const propertiesBox = xcss({
	display: 'flex',
	flexDirection: 'row',
	alignItems: 'center',
	gap: 'space.200',
	fontSize: 'larger',
	overflow: 'auto',
});

const General = ({ author, description, fps, opacity }: GeneralProps) => {
	const { updateBoard } = useBoardContext();

	return (
		<Box xcss={generalStyles}>
			<IconButton
				icon={DeleteIcon}
				label="Close without saving"
				appearance={'danger' as any as 'default'}
				isTooltipDisabled={false}
				ref={(ref) => {
					if (!ref) {
						return;
					}
					ref.style.width = '50px';
					ref.style.height = '50px';
				}}
				tooltip={{
					position: 'auto',
					hideTooltipOnClick: true,
				}}
				onClick={_ => { console.log('clicked'); }}
			/>
			<Box xcss={propertiesBox}>
				<Inline alignBlock="baseline">
					<span style={{ marginRight: '0.5em' }}>Author:</span>
					<Textfield
						appearance="standard"
						placeholder="Author"
						value={author}
						onChange={e => updateBoard({ boardUpdate: { author: e.currentTarget.value } })}
						onBlur={e => e.currentTarget.setSelectionRange(0, 0)}
						style={{ paddingBlock: '1px', pointerEvents: 'none', textAlign: 'right', width: '100%' }}
						ref={(ref: HTMLElement) => {
							if (!ref) {
								return;
							}
							ref.parentElement!.style.maxWidth = '8em';
							ref.parentElement!.style.minWidth = '8em';
							ref.parentElement!.style.width = '8em';
						}}
					/>
				</Inline>
				<Inline alignBlock="baseline">
					<span style={{ marginRight: '0.5em' }}>Description:</span>
					<Textfield
						appearance="standard"
						placeholder="Description"
						value={description}
						onChange={e => updateBoard({ boardUpdate: { description: e.currentTarget.value } })}
						onBlur={e => e.currentTarget.setSelectionRange(0, 0)}
						style={{ paddingBlock: '1px', pointerEvents: 'none', textAlign: 'right', width: '100%' }}
						ref={(ref: HTMLElement) => {
							if (!ref) {
								return;
							}
							ref.parentElement!.style.maxWidth = '16em';
							ref.parentElement!.style.minWidth = '16em';
							ref.parentElement!.style.width = '16em';
						}}
					/>
				</Inline>
				<Inline alignBlock="baseline">
					<span style={{ marginRight: '0.5em' }}>FPS:</span>
					<Textfield
						appearance="standard"
						defaultValue={fps}
						onBlur={e => {
							const validatedValue = Math.round(Number(e.currentTarget.value));
							e.currentTarget.value = String(validatedValue);
							updateBoard({ boardUpdate: { fps: validatedValue } });
							e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length);
						}}
						style={{ paddingBlock: '1px', pointerEvents: 'none', textAlign: 'right', width: '100%' }}
						ref={(ref: HTMLElement) => {
							if (!ref) {
								return;
							}
							ref.parentElement!.style.maxWidth = '2.5em';
							ref.parentElement!.style.minWidth = '2.5em';
							ref.parentElement!.style.width = '2.5em';
						}}
					/>
				</Inline>
				<Inline alignBlock="baseline">
					<span style={{ marginRight: '0.5em' }}>Opacity:</span>
					<Textfield
						appearance="standard"
						defaultValue={opacity}
						onBlur={e => {
							const validatedValue = Math.min(255, Math.max(Math.round(Number(e.currentTarget.value)), 0));
							e.currentTarget.value = String(validatedValue);
							updateBoard({ boardUpdate: { opacity: validatedValue } });
							e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length);
						}}
						style={{ paddingBlock: '1px', pointerEvents: 'none', textAlign: 'right', width: '100%' }}
						ref={(ref: HTMLElement) => {
							if (!ref) {
								return;
							}
							ref.parentElement!.style.maxWidth = '2.5em';
							ref.parentElement!.style.minWidth = '2.5em';
							ref.parentElement!.style.width = '2.5em';
						}}
					/>
				</Inline>
			</Box>
			<IconButton
				icon={_ => (
					<Image src={KrabikImage} alt="Anndrew logo" style={{ maxHeight: '40px' }} />
				)}
				label="Download edited ANN"
				appearance="primary"
				isTooltipDisabled={false}
				ref={(ref) => {
					if (!ref) {
						return;
					}
					ref.style.width = '50px';
					ref.style.height = '50px';
				}}
				tooltip={{
					position: 'auto',
				}}
				onClick={_ => { console.log('clicked'); }}
			/>
		</Box>
	);
};

export default General;
