import React from 'react';

export const blurOnEnterDown: React.KeyboardEventHandler<HTMLInputElement> = e => {
    if (e.key === 'Enter') {
        e.currentTarget.blur();
    }
}
