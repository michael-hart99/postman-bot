/**
 * Shuffles array in place. ES6 version
 * @param {Array} a items An array containing the items.
 */
function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function getPairing(n, previous=null) {
    const recipients = [...Array(n).keys()];

    let filteredList = [];
    while (filteredList.length < n) {
        shuffle(recipients);

        if (previous === null) {
            filteredList = recipients.filter((v, i) => v !== i);
        } else {
            filteredList = recipients.filter((v, i) => v !== i && v !== previous[i]);
        }
    }
    return recipients;
}
