import AddIcon from '@atlaskit/icon/core/add';
import { IconButton } from '@atlaskit/button/new';
import { useBoardContext } from './board-context';
import { getNextCardId } from '../models';
import { useRef } from 'react';
import { handleExceptionPromise, readImageFile } from '../event-handling';

export const ImageAdder = ({ columnId }: { columnId: string }) => {
	const { insertCard } = useBoardContext();

	const uploaderRef = useRef<HTMLInputElement | null>(null);

	return <>
		<IconButton
			icon={AddIcon}
			label={<span style={{ userSelect: 'none' }}>Upload image</span>}
			appearance="primary"
			shape="circle"
			isTooltipDisabled={false}
			ref={(ref) => {
				if (!ref) {
					return;
				}
				ref.style.width = '100%';
				ref.style.height = '50px';
			}}
			tooltip={{
				position: 'bottom',
				hideTooltipOnClick: true,
			}}
			onClick={_ => {
				const input = uploaderRef.current;
				if (!input) {
					return;
				}
				input.oncancel = () => {
					input.oncancel = null;
					input.onchange = null;
				};
				input.onchange = async () => {
					input.oncancel = null;
					input.onchange = null;
					const { name, contentUrl, offset } = await handleExceptionPromise(readImageFile(input.files?.[0]));
					insertCard({
						finishColumnId: columnId,
						item: {
							cardId: `card:${getNextCardId()}`,
							type: 'image-card',
							name,
							contentUrl,
							offset,
						},
					});
				};
				input.click();
			}}
		/>
		<input type="file" accept="image/jpeg,image/png,image/bmp,image/tiff,image/gif,.img" ref={uploaderRef} style={{ display: 'none' }} />
	</>;
};
