module.exports = {
    wrapper(fn, ...args) {
        return (async () => {
            let value;
            try {
                fn = fn.bind(this);
                value = await fn(...args);
            } catch (error) {
                return { error, value: null }
            }
            return { error: null, value };
        })()
    }
}