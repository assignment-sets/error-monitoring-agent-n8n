const basePath = process.cwd(); 

export const cleanStack = (stack) => {
    if (!stack) return stack;
    // Replace the absolute path and optional file:// prefix with a dot
    const pathRegex = new RegExp(`(file://)?${basePath}`, 'g');
    return stack.replace(pathRegex, '.');
};