const domBar = document.querySelector('.progress-bar');
const domValue = document.querySelector('.progress-value');
const domPoint = document.querySelector('.progress-point');

export const updateProgress = function(current, total) {
  let percent = current / total * 100;
  
  domValue.style.width = percent + '%';
  domPoint.style.left = percent > 98 ? '98%' : percent < 1 ? '1%' : percent + '%'; //右侧保持完整露出
  if (percent >= 80) {
    domBar.classList.add('progress-complete');
  } else {
    domBar.classList.remove('progress-complete');
  }
};

export const initProgress = function() {
  return;
  let progress = document.querySelector('.progress-bar');
  let tipAmounts = document.querySelectorAll('.orange');
  let worksPhotonAmount = +this.props.worksPhotonAmount;
  if (!worksPhotonAmount || worksPhotonAmount < 1 || isNaN(worksPhotonAmount)) {
    return;
  }
  tipAmounts[0].innerHTML = worksPhotonAmount + '光子';
  tipAmounts[1].innerHTML = worksPhotonAmount + '光子';
  progress.classList.remove('hide');
}