// experimental function to decompress compacted arrays in object
// this function isn't efficient and should be used only for debugging purposes
export function parseCompactJson(str: string) {
    var obj = JSON.parse(str);

    function checkAndReplace(o: any) {
        if (!o) return o;

        if (o instanceof Array && o.length >= 2 && o[0] == '$__') {
            const keys = o[1] as string[];

            let r = [];
            for (let i = 2; i < o.length; i++) {
                const child = {};
                for (let j = 0; j < keys.length; j++) {
                    child[keys[j]] = checkAndReplace(o[i][j])
                }
                r.push(child);
            }
            return r;
        } else if (o instanceof Array) {
            return o;
        } else if (typeof o == 'object') {
            let buf = {};
            for (let key of Object.keys(o)) {
                buf[key] = checkAndReplace(o[key]);
            }
            return buf;
        } else {
            return o;
        }
    }

    return checkAndReplace(obj);
}
