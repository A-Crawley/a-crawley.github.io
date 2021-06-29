$(function () {
  $("#contactForm input,#contactForm textarea").jqBootstrapValidation({
    preventSubmit: true,
    submitError: function ($form, event, errors) {
      // additional error messages or events
    },
    submitSuccess: function ($form, event) {
      event.preventDefault(); // prevent default submit behaviour
      // get values from FORM
      var name = $("input#name").val();
      var message = $("textarea#message").val();
      // Check for white space in name for Success/Fail message
      $this = $("#sendMessageButton");
      $this.prop("disabled", true); // Disable submit button until AJAX call is complete to prevent duplicate messages
      let metadata = [
        `AppName: ${navigator.appName}`,
        `UserAgent: ${navigator.userAgent}`,
        `Vendor: ${navigator.vendor}`,
      ];
      body = {
        Sender: name,
        Message: message,
        MetaData: metadata,
      };
      let url = "https://a-crawleyapimanagement.azure-api.net/EmailSender";
      let key = "5312825c5ebc48a58d91822a235dec43";
      $.ajax({
        type: "POST",
        url: url,
        data: JSON.stringify(body),
        crossDomain: true,
        headers: {
          "Access-Control-Allow-Origin":
            "https://a-crawleyapimanagement.azure-api.net/",
          "Ocp-Apim-Subscription-Key": key,
        },
      })
        .done(function (data) {
          $("#ModalLongTitle").html("Success");
          $("#ModalLongTitle").removeClass("text-danger");
          $("#ModalLongTitle").removeClass("text-success");
          $("#ModalLongTitle").addClass("text-success");
          $("#ModalContent").html(
            "Thank you for keeping in touch.<br/> I will get back to you at my next earliest convenience."
          );
          $("#ModalCenter").modal({ show: true });
        })
        .fail(function (data) {
          console.log(data);
          $("#ModalLongTitle").html("Error");
          $("#ModalLongTitle").removeClass("text-danger");
          $("#ModalLongTitle").removeClass("text-success");
          $("#ModalLongTitle").addClass("text-danger");
          $("#ModalContent").html(
            "Oops<br/>Something has gone wrong<br/>Please try again or contact me directly at <a>andrew.m.crawley@protonmail.com</a>"
          );
          $("#ModalCenter").modal({ show: true });
        })
        .always(function () {
          $("input#name").val("");
          $("textarea#message").val("");
          $("#sendMessageButton").prop("disabled", false);
        });
    },
    filter: function () {
      return $(this).is(":visible");
    },
  });

  $('a[data-toggle="tab"]').click(function (e) {
    e.preventDefault();
    $(this).tab("show");
  });
});

/*When clicking on Full hide fail/success boxes */
$("#name").focus(function () {
  $("#success").html("");
});
