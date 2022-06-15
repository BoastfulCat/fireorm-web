export const escapeRegExp = (value: string): string => {
    return value.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};
