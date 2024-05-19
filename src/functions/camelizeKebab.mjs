export default function camelizeKebab (name) {
    return name.replace(
        /-./g,
        x => x[1].toUpperCase()
    );
}
