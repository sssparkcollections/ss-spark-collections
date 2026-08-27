let currentSlide = 0;

const slides = document.querySelectorAll(".slide");
const dots = document.querySelectorAll(".dot");


function showSlide(index) {

    if (index >= slides.length) {
        currentSlide = 0;
    }

    else if (index < 0) {
        currentSlide = slides.length - 1;
    }

    else {
        currentSlide = index;
    }


    slides.forEach(function(slide) {
        slide.classList.remove("active");
    });


    dots.forEach(function(dot) {
        dot.classList.remove("active");
    });


    slides[currentSlide].classList.add("active");

    dots[currentSlide].classList.add("active");
}


function nextSlide() {

    showSlide(currentSlide + 1);

}


function previousSlide() {

    showSlide(currentSlide - 1);

}


function goToSlide(index) {

    showSlide(index);

}


/* Automatic Slider */

setInterval(function() {

    nextSlide();

}, 5000);