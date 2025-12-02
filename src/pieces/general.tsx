// eslint-disable-next-line @atlaskit/design-system/no-emotion-primitives -- to be migrated to @atlaskit/primitives/compiled – go/akcss
import { Box, Inline, xcss } from '@atlaskit/primitives';
import Textfield from '@atlaskit/textfield';
import { IconButton } from '@atlaskit/button/new';
import DeleteIcon from '@atlaskit/icon/core/delete';
import { useBoardContext } from './board-context';
import Image from '@atlaskit/image';
import Krabik from '../Krabik.png';
import { parseOpacity, stringifyOpacity, toInteger } from '../sanitization';
import { blurOnEnterDown } from '../event-handling';

type GeneralProps = {
	filename: string;
	author: string;
	description: string;
	fps: number;
	opacity: number;
	onClear: () => void;
	onSave: () => void;
};

const generalStyles = xcss({
	display: 'flex',
	flexDirection: 'row',
	justifyContent: 'space-between',
	paddingBlock: 'space.100',
	paddingInline: 'space.200',
	gap: 'space.200',
	userSelect: 'none',
});

const propertiesBox = xcss({
	display: 'flex',
	flexDirection: 'row',
	alignItems: 'center',
	gap: 'space.200',
	fontSize: 'larger',
	overflow: 'auto',
});

const General = ({ filename, author, description, fps, opacity, onClear, onSave }: GeneralProps) => {
	const { updateBoard } = useBoardContext();

	return (
		<Box xcss={generalStyles}>
			<IconButton
				icon={DeleteIcon}
				label={<span style={{ userSelect: 'none' }}>Close without saving</span>}
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
				onClick={onClear}
			/>
			<Box xcss={propertiesBox}>
				<Inline alignBlock="baseline">
					<span style={{ marginRight: '0.5em' }}>Filename:</span>
					<Textfield
						appearance="standard"
						defaultValue={filename}
						onKeyDown={blurOnEnterDown}
						onBlur={e => {
							updateBoard({ boardUpdate: { filename: e.currentTarget.value } });
							e.currentTarget.setSelectionRange(0, 0);
						}}
						style={{ paddingBlock: '1px', textAlign: 'right', width: '100%' }}
						ref={(ref: HTMLElement) => {
							if (!ref) {
								return;
							}
							ref.parentElement!.style.maxWidth = '8em';
							ref.parentElement!.style.minWidth = '8em';
							ref.parentElement!.style.width = '8em';
						}}
					/>
					<span>.ann</span>
				</Inline>
				<Inline alignBlock="baseline">
					<span style={{ marginRight: '0.5em' }}>Author:</span>
					<Textfield
						appearance="standard"
						defaultValue={author}
						onKeyDown={blurOnEnterDown}
						onBlur={e => {
							updateBoard({ boardUpdate: { author: e.currentTarget.value } });
							e.currentTarget.setSelectionRange(0, 0);
						}}
						style={{ paddingBlock: '1px', textAlign: 'right', width: '100%' }}
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
						defaultValue={description}
						onKeyDown={blurOnEnterDown}
						onBlur={e => {
							updateBoard({ boardUpdate: { description: e.currentTarget.value } });
							e.currentTarget.setSelectionRange(0, 0);
						}}
						style={{ paddingBlock: '1px', textAlign: 'right', width: '100%' }}
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
						onKeyDown={blurOnEnterDown}
						onBlur={e => {
							const validatedValue = Math.max(1, toInteger(e.currentTarget.value));
							e.currentTarget.value = String(validatedValue);
							updateBoard({ boardUpdate: { fps: validatedValue } });
							e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length);
						}}
						style={{ paddingBlock: '1px', textAlign: 'right', width: '100%' }}
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
						defaultValue={stringifyOpacity(opacity)}
						onKeyDown={blurOnEnterDown}
						onBlur={e => {
							const validatedValue = parseOpacity(e.currentTarget.value);
							e.currentTarget.value = stringifyOpacity(validatedValue);
							updateBoard({ boardUpdate: { opacity: validatedValue } });
							e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length);
						}}
						style={{ paddingBlock: '1px', textAlign: 'right', width: '100%' }}
						ref={(ref: HTMLElement) => {
							if (!ref) {
								return;
							}
							ref.parentElement!.style.maxWidth = '3.5em';
							ref.parentElement!.style.minWidth = '3.5em';
							ref.parentElement!.style.width = '3.5em';
						}}
					/>
					<span>%</span>
				</Inline>
			</Box>
			<IconButton
				icon={_ => (
					<Image src={Krabik} alt="Anndrew logo" style={{ maxHeight: '40px' }} />
				)}
				label={<span style={{ userSelect: 'none' }}>Download edited ANN</span>}
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
				onClick={onSave}
			/>
		</Box>
	);
};

export default General;
