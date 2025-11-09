import React from 'react';
import { useDroppable, type UniqueIdentifier } from '@dnd-kit/core';

type DroppableProps = {
    id: UniqueIdentifier,
};

export function Droppable(props: React.PropsWithChildren<DroppableProps>) {
    const { isOver, setNodeRef } = useDroppable({
        id: props.id,
    });
    const style = {
        opacity: isOver ? 1 : 0.5,
    };

    return (
        <div ref={setNodeRef} style={style}>
            {props.children}
        </div>
    );
}
