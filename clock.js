const ms = 1;
const s = ms * 1000;
const m = s * 60;
const h = m * 60;
const d = h * 24;

const start_time = (function () {
    const time = new Date();
    const document_time = document.timeline.currentTime;
    const hour_diff = time.getHours() - time.getUTCHours();
    const current_time = (Number(time) % d) + (hour_diff * h);

    return document_time - current_time;
}());

const single_digit_keyframes = [
    {transform: "translateX(0)"},
    {transform: "translateX(calc(var(--len, 10) * -1ch)"}
];
const double_digit_keyframes = [
    {transform: "translateX(0)"},
    {transform: "translateX(calc(var(--len) * -2ch)"}
];

function range(len) {
    return new Array(len).fill(true);
}

function digits(len = 10, zero_based = true) {
    const digit = document.getElementById("digit").content.cloneNode(true);
    digit.firstElementChild.style.setProperty("--len", len);

    digit.firstElementChild.firstElementChild.append(
        ...range(len).map(function (ignore, index) {
            const span = document.createElement("span");
            span.textContent = zero_based ? index : index + 1;
            return span;
        })
    );

    if (len > 10) {
        digit.firstElementChild.classList.add("wide");
    }

    return digit;
}

(function build_analog_clock() {
    const clock = document.getElementById("analog-clock");
    const tick_template = document.getElementById("tick");
    const hour_marks_container = clock.querySelector(".hour-ticks");
    const minute_marks_container = clock.querySelector(".minute-ticks");
    const day = clock.querySelector(".day");

    hour_marks_container.append(...range(24).map(function (ignore, index) {
        const tick = tick_template.content.cloneNode(true);
        const shifted = index + 1;
        tick.firstElementChild.style.setProperty("--index", shifted);
        tick.firstElementChild.firstElementChild.textContent = shifted;
        return tick;
    }));

    minute_marks_container.append(...range(60).map(function (ignore, index) {
        const tick = tick_template.content.cloneNode(true);
        tick.firstElementChild.style.setProperty("--index", index);
        tick.firstElementChild.firstElementChild.remove();
        return tick;
    }));
}());

(function build_digital_clock() {
    const clock = document.getElementById("digital-clock");
    const hours = clock.querySelector(".hours");
    const minutes = clock.querySelector(".minutes");
    const seconds = clock.querySelector(".seconds");
    const milliseconds = clock.querySelector(".milliseconds");

    hours.append(digits(24));
    minutes.append(digits(6), digits());
    seconds.append(digits(6), digits());
    milliseconds.append(digits(), digits(), digits());
}());

(function start_analog_clock() {
    const clock = document.getElementById("analog-clock");
    if (clock === null) {
        return;
    }

    const second = clock.querySelector(".second");
    const minute = clock.querySelector(".minute");
    const hour = clock.querySelector(".hour");

    const hands = [second, minute, hour];
    const hand_durations = [m, h, d];
    const steps = [60, 60, 120];

    const movement = [];

    hands.forEach(function (hand, index) {
        const duration = hand_durations[index];
        const easing = `steps(${steps[index]}, end)`;
        movement.push(hand.animate(
            [
                {transform: "rotate(0turn)"},
                {transform: "rotate(1turn)"}
            ],
            {duration, iterations: Infinity, easing}
        ));
        
        const shadow = hand.querySelector(".shadow");
        if (shadow) {
            movement.push(shadow.animate(
                [
                    {transform: "rotate(1turn) translate(3px) rotate(0turn)"},
                    {transform: "rotate(0turn) translate(3px) rotate(1turn)"}
                ],
                {duration, iterations: Infinity, iterationStart: 0.9, easing}
            ));
        }
    });

    movement.forEach(function (move) {
        move.startTime = start_time;
    });
}());

(function start_digital_clock() {
    const clock = document.getElementById("digital-clock");
    if (clock === null) {
        return;
    }
    const milliseconds = clock.querySelector(".milliseconds");
    const seconds = clock.querySelector(".seconds");
    const minutes = clock.querySelector(".minutes");
    const hours = clock.querySelector(".hours");
    const sections = [seconds, minutes];

    const durations = [s, m, h];
    const animations = [];

    Array.from(
        milliseconds.children
    ).reverse().forEach(function (digit, index) {
        animations.push(digit.firstElementChild.animate(
            single_digit_keyframes,
            {
                duration: ms * (10 ** (index + 1)),
                iterations: Infinity,
                easing: "steps(10, end)"
            }
        ));
    });

    sections.forEach(function (section, index) {
        Array.from(
            section.children
        ).forEach(function (digit) {
            const nr_digits = digit.firstElementChild.children.length;
            animations.push(digit.firstElementChild.animate(
                single_digit_keyframes,
                {
                    duration: (
                        nr_digits === 10
                        ? durations[index] * 10
                        : durations[index + 1]
                    ),
                    iterations: Infinity,
                    easing: `steps(${nr_digits}, end)`
                }
            ));
        });
    });

    Array.from(hours.children).forEach(function (digit) {
        const nr_digits = digit.firstElementChild.children.length;
        animations.push(
            digit.firstElementChild.animate(
                double_digit_keyframes,
                {
                    duration: d,
                    iterations: Infinity,
                    easing: `steps(${nr_digits}, end)`
                }
            )
        );
    });

    animations.forEach(function (animation) {
        animation.startTime = start_time;
    });
}());

(function set_up_date_complication() {
    const day = document.querySelector(".day");
    if (day === null) {
        return;
    }

    function month() {
        const now = new Date();
        return digits(
            (new Date(now.getFullYear(), now.getMonth() + 1, 0)).getDate(),
            false
        );
    }

    function create_animation(digit) {
        const nr_digits = digit.firstElementChild.children.length;
        const duration = d * nr_digits;
        return digit.firstElementChild.animate(
            double_digit_keyframes,
            {
                duration,
                easing: `steps(${nr_digits}, end)`,
                iterationStart: (d * ((new Date()).getDate() - 1)) / duration
            }
        );
    }

    // on future calls the day might be full
    const new_day = day.cloneNode();
    new_day.append(month());
    day.replaceWith(new_day);

    Array.from(new_day.children).forEach(function (digit) {
        const complication = create_animation(digit);
        complication.startTime = start_time;
        complication.finished.then(set_up_date_complication);
    });
}());
