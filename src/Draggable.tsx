import React from 'react';
import {useDraggable, type UniqueIdentifier} from '@dnd-kit/core';
import {CSS} from '@dnd-kit/utilities';

type DraggableProps = {
    id: UniqueIdentifier,
};

export function Draggable(props: React.PropsWithChildren<DraggableProps>) {
  const {attributes, listeners, setNodeRef, transform} = useDraggable({
    id: props.id,
  });
  const style = {
    // Outputs `translate3d(x, y, 0)`
    transform: CSS.Translate.toString(transform),
  };

  return (
    <button ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {props.children}
    </button>
  );
}
