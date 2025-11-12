import AddIcon from '@atlaskit/icon/core/add';
import { IconButton } from '@atlaskit/button/new';
import { useBoardContext } from './board-context';
import { getNextCardId } from '../models';

export const ColumnAdder = () => {
	const { getColumns, insertColumn } = useBoardContext();

	return (
		<IconButton
			icon={AddIcon}
			label="Create event"
			appearance="primary"
			shape="circle"
			isTooltipDisabled={false}
			ref={(ref) => {
				if (!ref) {
					return;
				}
				ref.style.width = '50px';
				ref.style.height = '100%';
			}}
			tooltip={{
				position: 'auto',
				hideTooltipOnClick: true,
			}}
			onClick={_ => {
				insertColumn({
					finishIndex: getColumns().length,
					column: {
						type: 'event-column',
						columnId: `column:${getNextCardId()}`,
						name: 'EVENT NAME',
						items: [],
						loopLength: 0,
						opacity: 255,
					},
				});
			}}
		/>
	);
};
