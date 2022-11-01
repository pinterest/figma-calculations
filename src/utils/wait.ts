const wait = (time: number) =>
    new Promise((res) => {
        setTimeout(() => {
            res(true);
        }, time);
    });

export default wait;
