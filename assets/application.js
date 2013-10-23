$.fn.spin = function(opts) {
  this.each(function() {
    var $this = $(this),
        data = $this.data();

    if (data.spinner) {
      data.spinner.stop();
      delete data.spinner;
    }
    if (opts !== false) {
      data.spinner = new Spinner($.extend({color: $this.css('color')}, opts)).spin(this);
    }
  });
  return this;
};

var spinOpts = {
  lines: 14, // The number of lines to draw
  length: 21, // The length of each line
  width: 10, // The line thickness
  radius: 37, // The radius of the inner circle
  color: '#FFF', // #rgb or #rrggbb
  speed: 0.5, // Rounds per second
  trail: 78, // Afterglow percentage
  shadow: true, // Whether to render a shadow
  hwaccel: true, // Whether to use hardware acceleration
  className: 'spinner', // The CSS class to assign to the spinner
  zIndex: 2e9, // The z-index (defaults to 2000000000)
  top: 'auto', // Top position relative to parent in px
  left: 'auto' // Left position relative to parent in px
};

(function($){
  $.countdown.setDefaults({
    format: 'hms',
    layout: '{hnn}{sep}{mnn}{sep}{snn}'
  });

  $('.job').each(function(){
    var $remainingTime = $('.remaining-time', this);
    var remainingTime  = $remainingTime.data('remaining-time');
    $remainingTime.countdown({
      until: +remainingTime
    });
  });

  $('.spin-container').hide();
  $('.spin').spin(spinOpts);

  checkServices();
  quarantineTests();
  setTimeout("updateBuilds()", 30000);
}(jQuery));

function updateBuilds() {
  $('.spin-container').show();
  checkServices();
  quarantineTests();

  $.ajax({
    url: 'builds.json',
    dataType : 'json',
    success: function (jobs) {
      $('.spin-container').hide();
      if (jobs.length > 0)
        updateJobs(jobs);
      else
        $('#hudson-info').removeClass('hidden');

      setTimeout("updateBuilds()", 30000);
    },
    error: function () {
      $('#all-green, #broken-build').addClass('hidden');
      $('#hudson-info').removeClass('hidden');
      setTimeout("updateBuilds()", 30000);
    }
  });
}

function updateJobs(jobs) {
  var allGreen = true,
      brokenBuild = false;
  $('#hudson-info').addClass('hidden');

  $.each(jobs, function (name, info) {
    allGreen = allGreen && (info.status == "SUCCESS");
    brokenBuild = brokenBuild || (info.status == "FAILURE");
    updateJobList(name, info);
  });

  if (brokenBuild) {
    $('#broken-build').removeClass('hidden');
    $('#all-green').addClass('hidden');
  } else if (allGreen) {
    $('#all-green').removeClass('hidden');
    $('#broken-build').addClass('hidden');

    if ($('.secondary_jobs li').length == 0)
      $('#all-green span').html('HUDSON IS BACK! (HIT F5)');
  } else {
    $('#all-green, #broken-build').addClass('hidden');
  }
}

function quarantineTests() {
  $.get('/quarantine.json', function(data) {
    if(jQuery.isEmptyObject(data['quarantine_tests'])) {
      $('#quarantine-tests').hide();
    } else {
      $('#quarantine-tests').show();
      var failed = data['quarantine_tests']['failed'],
          passed = data['quarantine_tests']['passed'],
          total  = data['quarantine_tests']['total'];
      $('#quarantine-tests .total').text('Total: '+total);
      $('#quarantine-tests .failed').text('Failed: '+failed);
      $('#quarantine-tests .passed').text('Passed: '+passed);
    }
  });
};

function checkServices() {
  $.ajax({
    url: "/status.json",
    success: function (data) {
      var statusList = "";
      $.each(data, function (e) {
        var cssClass = (data[e].time >= 1) ? 'slow' : '';
        cssClass = data[e].status + ' ' + cssClass;

        var response = data[e].time ? (data[e].time + 's') : '';
        if (!response)
          response = data[e].response;

        statusList+='<li>' +
                      '<span class="service-status ' + cssClass + '">'+ response +'</span>' +
                      '<span class="service-name">'+e+'</span>' +
                    '</li>'
      });
      $('.statuses').html(statusList);
    }
  });
}

function updateJobList(name, info) {
  var $job            = $('#' + info.name).closest('li');
  var $prioritaryList = $('.prioritary_jobs');
  var $secondaryList  = $('.secondary_jobs');
  var isSuccess       = info.status == "SUCCESS";

  $job.find('.on-queue').toggleClass('hidden', !info.on_queue);

  if (isSuccess) {
    $job.hide();

    $job.attr('class', info.color);
    $job.find('.build-number').text(info.build_number);

    $job.prependTo($secondaryList);
    $job.show();
  } else {
    var $remainingTime = $('.remaining-time', $job);
    $job.hide();
    $job.prependTo($prioritaryList);

    $job.attr('class',info.color);
    $job.find('.build-number').text(info.build_number);

    $job.find('.authors').text(info.authors);
    $job.find('.commit-hash').text(info.commit_hash);
    $job.find('.message').text(info.message);


    var authorsPics = '';
    $.each(info.authors_pics, function(){
      authorsPics += "<img class='commiter-images' src='/images/" + this + "'>"
    });

    $job.find('.commiters').empty().append(authorsPics);
    $remainingTime.attr('data-remaining-time', info.remaining_time);

    if (info.status == "BUILDING") {
      $remainingTime.countdown('change', 'until', +info.remaining_time);
    }
    $job.show();
  }
}
