// eslint-disable-next-line @atlaskit/design-system/no-emotion-primitives -- to be migrated to @atlaskit/primitives/compiled – go/akcss
import { Box, Inline, xcss } from '@atlaskit/primitives';
import Textfield from '@atlaskit/textfield';
import { useBoardContext } from './board-context';

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
	const { updateBoard } = useBoardContext();

	return (
		<Box xcss={generalStyles}>
			<Inline alignBlock="baseline">
				<span>Author:</span>
				<Textfield
					appearance="subtle"
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
				<span>Description:</span>
				<Textfield
					appearance="subtle"
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
				<span>FPS:</span>
				<Textfield
					appearance="subtle"
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
				<span>Opacity:</span>
				<Textfield
					appearance="subtle"
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
	);
};

export default General;
