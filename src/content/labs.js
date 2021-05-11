const items = [
    {
        title: "Eye-See: VR Glaucoma Test",
        body: `
        Glaucoma is the second leading global cause of blindness. Over 1 million cases occur annually in India, with many going undiagnosed.
        EyeSee is a portable visual field testing device using a VR headset. It is a frugal alternative to the Humphrey method of testing, commonly used by ophthalmologists to detect blind spots. When taking the test, the user is presented with flashing dots at various locations in the field of view and responds by giving signals (button clicks) when they see a dot. A DIY test promotes early diagnosis and awareness in remote and rural regions without sophisticated testing labs.
        Winner at Carl Zeiss Bi-Nation Hackathon 2018 (Manufacturers of Humphrey Apparatus).
        Innovate for Society Award from Accenture Innovation Challenge 2018.
        `,
        url: "/post/golden-gate",
        buttons: [{
            url: "https://yourstory.com/2018/10/healthcare-innovator-aayush-wins-accenture-innovation-challenge/#eyesee",
            label: "In The News"
        }]
    },
    {
        title: "snAPI - REST api from JSON",
        body:
        `
        A backend server that creates dynamic REST API endpoints from JSON input. We won the Social Media award at PESU InGenius 2015.
        `,
        url: "/post/beach",
    },
    {
        title: "Broget: Raspberry Pi Content Distribution Network",
        body:`
        Broget is a way to remotely download and transfer files to circumvent difficult network environments. Broget can remotely start downloads while you're outside and sync them when you get home. Broget can be used to serve content to customers in retail stores.
        
        The Under 25 Summit
        We were given exclusive passes to attend the launch of Startup India by PM Narendra Modi in Delhi. We were the youngest attendees at the event.
        `,
        url: "/post/road",
        buttons: [{
            url: "https://github.com/EnKrypt/BroGet",
            label: "Github Repo"
        }]
    },
    {
        title: "SMS: Serverless Messaging System",
        body:
        `
        A javascript library for communication between clients without a preestablished trusted server.
        `,
        url: "/post/ballons",
        buttons: [{
            url: "https://github.com/prnthh/SMS",
            label: "Github Repo"
        }]
    },
    {
        image: "/assets/labs/chatbot.png",
        title: "Talker: A Classical Chatbot",
        body:
        `
        A chatbot built to demonstrate how chat interfaces can make data retrieval seamless.
        
        This was built as a college project, modelled around the use case of a hospital.
        `,
        url: "/post/ballons",
        buttons: [{
            url: "https://github.com/prnthh/talker-bot",
            label: "Github Repo"
        }]
    },
    {
        title: "HaNS - Haptic Navigation System",
        body:
        `
        Internal navigation - it uses an accelerometer to bridge the gaps between imprecise GPS data. It tries to predict the position of the user where GPS does not provide sufficiently accurate location data.
        
        We were awarded 1 lakh at InMobi Hackday Spring for our demonstration.`,
        url: "/post/ballons",
        buttons: [{
            url: "https://devpost.com/software/hans-haptic-automated-navigation-system",
            label: "Devpost"
        }]
    },
    {
        title: "Jeevan - Neonatal Pregnancy Monitor",
        body:
        `
        An extremely frugal and safe pregnancy monitoring kit for rural communities.
        Jeevan was build using an arduino, one AD8232 ECG sensor, and a Grove piezovibration sensor.
        
        Runners' up at IESA Makeathon 18'.`,
        url: "/post/ballons",
        buttons: [{
            url: "https://github.com/nehsus/Jeevan",
            label: "Github Repo"
        }]
    },
    {
        image: "/assets/labs/autlearn.png",
        title: "Aut.learn - Emote Sensor",
        body:
        `
        A wearable sensor capable of detecting emotional outbursts in students, monitoring their stress levels as they solve problems of varying difficulty.
        
        Awarded Best Innovative Product by eCell at IIT Kharagpur.`,
        url: "/post/ballons",
        buttons: [{
            url: "https://github.com/prnthh/Emote-Inc---Healthcare",
            label: "Github Repo"
        }, 
        {
            url: "http://www.ecell-iitkgp.org/empresario/winner.php",
            label: "The Award"
        }]
    },
    {
        image: "/assets/labs/steamit.png",
        title: "SteamIT: Portable Steam Dishwasher",
        body:
        `
        A steam bashed dishwasher that can be powered from the excess heat produced while cooking. This device is designed to be portable enough for use by street vendors in Bangalore.
        
        We were given a stipend to research and build this product at IISc Bangalore's Center for Product Design and Manufacturing.`,
        url: "/post/ballons",
    },
];

export default items;
