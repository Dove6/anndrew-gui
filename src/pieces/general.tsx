// eslint-disable-next-line @atlaskit/design-system/no-emotion-primitives -- to be migrated to @atlaskit/primitives/compiled – go/akcss
import { Box, Inline, xcss } from '@atlaskit/primitives';
import { Checkbox } from '@atlaskit/checkbox';
import Textfield from '@atlaskit/textfield';
import { IconButton } from '@atlaskit/button/new';
import DeleteIcon from '@atlaskit/icon/core/delete';
import Image from '@atlaskit/image';
import Krabik from '../Krabik.png';
import { parseOpacity, stringifyOpacity, toInteger } from '../sanitization';
import { blurOnEnterDown } from '../event-handling';
import type { BoardUpdate } from '../models';

type GeneralProps = {
	filename: string;
	author: string;
	description: string;
	fps: number;
	opacity: number;
	compressed: boolean;
	onUpdate: (boardUpdate: BoardUpdate) => void;
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

const General = ({ filename, author, description, fps, opacity, compressed, onUpdate, onClear, onSave }: GeneralProps) => {
	const checkboxId = "general-compressed-checkbox";

	return (
		<Box xcss={generalStyles}>
			<IconButton
				icon={DeleteIcon}
				label={<span style={{ userSelect: 'none' }}>Close without saving</span>}
				appearance={'danger' as 'default'}
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
				onClick={() => confirm('Do you really want to close the project without saving?') ? onClear() : undefined}
			/>
			<Box xcss={propertiesBox}>
				<Inline alignBlock="baseline">
					<span style={{ marginRight: '0.5em' }}>Filename:</span>
					<Textfield
						appearance="standard"
						defaultValue={filename}
						onKeyDown={blurOnEnterDown}
						onBlur={e => {
							onUpdate({ filename: e.currentTarget.value });
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
							onUpdate({ author: e.currentTarget.value });
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
							const description = e.currentTarget.value;
							if (description.length > 12) {
								alert('Short description cannot be longer than 12 characters!');
								e.currentTarget.focus();
								return;
							}
							onUpdate({ description });
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
							onUpdate({ fps: validatedValue });
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
							onUpdate({ opacity: validatedValue });
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
				<Inline alignBlock="baseline">
					<span style={{ marginRight: '0.5em' }}><label htmlFor={checkboxId}>Compressed:</label></span>
					<Checkbox
						id={checkboxId}
						defaultChecked={compressed}
						onClick={_ => onUpdate({ compressed: !compressed })}
					/>
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
